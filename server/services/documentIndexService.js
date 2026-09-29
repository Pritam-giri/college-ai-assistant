const pdfParse = require('pdf-parse');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const { generateEmbeddings, embeddingDimensions } = require('./aiService');

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 250;
const EMBEDDING_BATCH_SIZE = 20;
const MAX_CHUNKS = 300;

function splitIntoChunks(text) {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
  const chunks = [];
  let start = 0;

  while (start < cleanText.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(start + CHUNK_SIZE, cleanText.length);
    if (end < cleanText.length) {
      const boundary = cleanText.lastIndexOf(' ', end);
      if (boundary > start + Math.floor(CHUNK_SIZE * 0.65)) end = boundary;
    }
    const content = cleanText.slice(start, end).trim();
    if (content) chunks.push(content);
    if (end >= cleanText.length) {
      start = cleanText.length;
      break;
    }
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  if (start < cleanText.length) {
    throw new Error('The PDF is too long to index. Split it into smaller documents.');
  }
  return chunks;
}

async function extractPdfText(buffer) {
  const parsed = await pdfParse(buffer);
  const text = String(parsed.text || '').replace(/\0/g, '').trim();
  if (text.length < 40) {
    throw new Error('No selectable text was found in this PDF. Scanned PDFs need OCR before they can be searched.');
  }
  return text;
}

async function buildChunkRecords(document, buffer) {
  const text = await extractPdfText(buffer);
  const chunks = splitIntoChunks(text);
  const embeddings = [];

  for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    const vectors = await generateEmbeddings(
      batch.map((chunk) => `${document.title}\n${chunk}`),
      'RETRIEVAL_DOCUMENT'
    );
    embeddings.push(...vectors);
  }

  if (embeddings.some((vector) => vector.length !== embeddingDimensions)) {
    throw new Error('The embedding service returned an invalid vector.');
  }

  return chunks.map((content, chunkIndex) => ({
    document: document._id,
    title: document.title,
    category: document.category || '',
    department: document.department,
    fileUrl: document.fileUrl,
    uploadedAt: document.createdAt || new Date(),
    chunkIndex,
    content,
    embedding: embeddings[chunkIndex],
  }));
}

async function indexUploadedPdf(document, buffer) {
  await KnowledgeChunk.deleteMany({ document: document._id });
  const records = await buildChunkRecords(document, buffer);
  await KnowledgeChunk.insertMany(records, { ordered: true });
  return records.length;
}

async function syncDocumentMetadata(document) {
  await KnowledgeChunk.updateMany(
    { document: document._id },
    {
      $set: {
        title: document.title,
        category: document.category || '',
        department: document.department,
        fileUrl: document.fileUrl,
      },
    }
  );
}

async function removeDocumentChunks(documentId) {
  await KnowledgeChunk.deleteMany({ document: documentId });
}

module.exports = {
  extractPdfText,
  splitIntoChunks,
  indexUploadedPdf,
  syncDocumentMetadata,
  removeDocumentChunks,
};
