const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const servicePath = path.resolve(__dirname, '../services/knowledgeRetrievalService.js');

function loadRetrievalService({ rows, queryVector }) {
  const originalLoad = Module._load;
  const captured = { findFilter: null, queryTask: null };
  const knowledgeChunk = {
    find(filter) {
      captured.findFilter = filter;
      return {
        select() {
          return {
            limit() {
              return {
                lean: async () => rows.filter((row) => filter.department.$in.includes(row.department)),
              };
            },
          };
        },
      };
    },
  };
  const aiService = {
    generateEmbeddings: async (_texts, taskType) => {
      captured.queryTask = taskType;
      return [queryVector];
    },
  };
  delete require.cache[servicePath];
  Module._load = function (request, parent) {
    if (request.startsWith('.') && parent?.filename === servicePath) {
      const resolved = path.resolve(path.dirname(parent.filename), `${request}.js`);
      if (resolved === path.resolve(__dirname, '../models/KnowledgeChunk.js')) return knowledgeChunk;
      if (resolved === path.resolve(__dirname, '../services/aiService.js')) return aiService;
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    return { service: require(servicePath), captured };
  } finally {
    Module._load = originalLoad;
  }
}

test('local vector retrieval ranks matching chunks and restricts results to the department plus ALL', async () => {
  const previousProvider = process.env.RAG_VECTOR_PROVIDER;
  process.env.RAG_VECTOR_PROVIDER = 'local';
  try {
    const queryVector = Array(768).fill(0);
    queryVector[0] = 1;
    const matchingVector = [...queryVector];
    const unrelatedVector = Array(768).fill(0);
    unrelatedVector[1] = 1;
    const rows = [
      { title: 'CSE Exam Notice', category: 'notice', department: 'CSE', fileUrl: '/cse.pdf', content: 'CSE examination form deadline is 30 September.', embedding: matchingVector },
      { title: 'General College Calendar', category: 'calendar', department: 'ALL', fileUrl: '/calendar.pdf', content: 'The college calendar is published here.', embedding: matchingVector },
      { title: 'Electronics Timetable', category: 'timetable', department: 'ELECTRONICS', fileUrl: '/electronics.pdf', content: 'Unrelated department timetable.', embedding: matchingVector },
      { title: 'Unrelated CSE Material', category: 'document', department: 'CSE', fileUrl: '/other.pdf', content: 'Different content.', embedding: unrelatedVector },
    ];
    const { service, captured } = loadRetrievalService({ rows, queryVector });

    const results = await service.searchRelevantChunks('CSE exam form deadline', 'CSE');
    assert.deepEqual(captured.findFilter, { department: { $in: ['CSE', 'ALL'] } });
    assert.equal(captured.queryTask, 'RETRIEVAL_QUERY');
    assert.deepEqual(results.map((result) => result.source.title), ['CSE Exam Notice', 'General College Calendar']);
    assert.ok(results.every((result) => result.score >= 0.42));
  } finally {
    if (previousProvider === undefined) delete process.env.RAG_VECTOR_PROVIDER;
    else process.env.RAG_VECTOR_PROVIDER = previousProvider;
  }
});
