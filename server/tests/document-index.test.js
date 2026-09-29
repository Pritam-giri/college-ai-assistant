const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const servicePath = path.resolve(__dirname, '../services/documentIndexService.js');

function loadIndexService({ pdfParse, knowledgeChunk, aiService }) {
  const originalLoad = Module._load;
  const serviceModules = new Map([
    [path.resolve(__dirname, '../models/KnowledgeChunk.js'), knowledgeChunk],
    [path.resolve(__dirname, '../services/aiService.js'), aiService],
  ]);

  delete require.cache[servicePath];
  Module._load = function (request, parent) {
    if (request === 'pdf-parse' && parent?.filename === servicePath) return pdfParse;
    if (request.startsWith('.') && parent?.filename === servicePath) {
      const resolved = path.resolve(path.dirname(parent.filename), `${request}.js`);
      if (serviceModules.has(resolved)) return serviceModules.get(resolved);
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    return require(servicePath);
  } finally {
    Module._load = originalLoad;
  }
}

test('PDF chunking normalizes text, overlaps chunks, and enforces the index size limit', () => {
  const { splitIntoChunks } = loadIndexService({
    pdfParse: async () => ({ text: '' }),
    knowledgeChunk: {},
    aiService: {},
  });
  const chunks = splitIntoChunks(`  ${'college record '.repeat(400)}  `);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 1800));
  assert.ok(chunks[0].length > 1500);
  assert.throws(() => splitIntoChunks('x'.repeat(600000)), /too long to index/i);
});

test('PDF text extraction accepts selectable text and rejects scans without OCR text', async () => {
  let text = 'This PDF has enough selectable text to be indexed by the college assistant.';
  const { extractPdfText } = loadIndexService({
    pdfParse: async () => ({ text: `\0${text}` }),
    knowledgeChunk: {},
    aiService: {},
  });

  assert.equal(await extractPdfText(Buffer.from('pdf')), text);
  text = '   ';
  await assert.rejects(extractPdfText(Buffer.from('scan')), /OCR/i);
});

test('PDF indexing saves embedded chunks with source metadata', async () => {
  const inserted = [];
  const removed = [];
  const knowledgeChunk = {
    deleteMany: async (query) => removed.push(query),
    insertMany: async (records) => inserted.push(...records),
  };
  const aiService = {
    embeddingDimensions: 768,
    generateEmbeddings: async (inputs, taskType) => {
      assert.equal(taskType, 'RETRIEVAL_DOCUMENT');
      return inputs.map(() => Array(768).fill(0.25));
    },
  };
  const { indexUploadedPdf } = loadIndexService({
    pdfParse: async () => ({ text: 'Verified college information. '.repeat(30) }),
    knowledgeChunk,
    aiService,
  });
  const document = {
    _id: 'doc-1',
    title: 'Academic Calendar',
    category: 'calendar',
    department: 'CSE',
    fileUrl: 'https://files.example/calendar.pdf',
    createdAt: new Date('2026-09-01'),
  };

  const count = await indexUploadedPdf(document, Buffer.from('pdf'));
  assert.equal(count, 1);
  assert.deepEqual(removed, [{ document: 'doc-1' }]);
  assert.equal(inserted[0].document, 'doc-1');
  assert.equal(inserted[0].department, 'CSE');
  assert.equal(inserted[0].fileUrl, document.fileUrl);
  assert.equal(inserted[0].embedding.length, 768);
});
