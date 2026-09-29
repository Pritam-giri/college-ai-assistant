const KnowledgeChunk = require('../models/KnowledgeChunk');
const { generateEmbeddings } = require('./aiService');

const VECTOR_INDEX = process.env.RAG_VECTOR_INDEX || 'college_knowledge_vector';
const VECTOR_PROVIDER = (process.env.RAG_VECTOR_PROVIDER || 'auto').toLowerCase();
const SEARCH_LIMIT = 6;
const configuredMinScore = Number(process.env.RAG_MIN_SCORE || 0.42);
const MIN_SCORE = Number.isFinite(configuredMinScore) && configuredMinScore >= 0 && configuredMinScore <= 1
  ? configuredMinScore
  : 0.42;

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let i = 0; i < left.length; i += 1) {
    dot += left[i] * right[i];
    leftMagnitude += left[i] * left[i];
    rightMagnitude += right[i] * right[i];
  }
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function visibleDepartments(department) {
  return department ? [String(department).toUpperCase(), 'ALL'] : ['ALL'];
}

function toResult(chunk, score) {
  return {
    content: chunk.content,
    score,
    source: {
      title: chunk.title,
      category: chunk.category || '',
      department: chunk.department,
      url: chunk.fileUrl,
      uploadedAt: chunk.uploadedAt || chunk.createdAt || null,
    },
  };
}

async function searchWithAtlas(vector, departments) {
  const rows = await KnowledgeChunk.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: 'embedding',
        queryVector: vector,
        numCandidates: 120,
        limit: SEARCH_LIMIT,
        filter: { department: { $in: departments } },
      },
    },
    {
      $project: {
        title: 1,
        category: 1,
        department: 1,
        fileUrl: 1,
        content: 1,
        uploadedAt: 1,
        createdAt: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);
  return rows.map((row) => toResult(row, row.score));
}

async function searchLocally(vector, departments) {
  const chunks = await KnowledgeChunk.find({ department: { $in: departments } })
    .select('+embedding title category department fileUrl content uploadedAt createdAt')
    .limit(2000)
    .lean();
  return chunks
    .map((chunk) => toResult(chunk, cosineSimilarity(vector, chunk.embedding || [])))
    .sort((a, b) => b.score - a.score)
    .slice(0, SEARCH_LIMIT);
}

async function searchRelevantChunks(question, department) {
  const [queryVector] = await generateEmbeddings([question], 'RETRIEVAL_QUERY');
  const departments = visibleDepartments(department);
  let results;

  if (VECTOR_PROVIDER === 'local') {
    results = await searchLocally(queryVector, departments);
  } else if (VECTOR_PROVIDER === 'atlas') {
    results = await searchWithAtlas(queryVector, departments);
  } else if (VECTOR_PROVIDER === 'auto') {
    try {
      results = await searchWithAtlas(queryVector, departments);
    } catch (error) {
      console.warn('Atlas Vector Search unavailable; using bounded local vector search.', {
        code: error?.code || 'VECTOR_SEARCH_UNAVAILABLE',
      });
      results = await searchLocally(queryVector, departments);
    }
  } else {
    const error = new Error('RAG_VECTOR_PROVIDER must be auto, atlas, or local.');
    error.isAIProviderError = true;
    throw error;
  }

  return results.filter((result) => result.score >= MIN_SCORE);
}

module.exports = { searchRelevantChunks, cosineSimilarity, visibleDepartments };
