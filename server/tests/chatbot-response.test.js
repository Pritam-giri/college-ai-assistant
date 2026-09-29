// tests/chatbot-response.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const SERVER = path.resolve(__dirname, '..');
process.env.GEMINI_API_KEY ||= 'test-only-key';
const bareFakes = new Map();
const pathFakes = new Map();

const originalLoad = Module._load;
Module._load = function (request, parent) {
  if (bareFakes.has(request)) return bareFakes.get(request);
  if (request.startsWith('.') && parent && parent.filename) {
    const abs = path.resolve(path.dirname(parent.filename), request).replace(/\.js$/, '');
    if (pathFakes.has(abs)) return pathFakes.get(abs);
  }
  return originalLoad.apply(this, arguments);
};

function loadFresh(rel, { bare = {}, paths = {} } = {}) {
  bareFakes.clear();
  pathFakes.clear();
  for (const [name, fake] of Object.entries(bare)) bareFakes.set(name, fake);
  for (const [p, fake] of Object.entries(paths)) pathFakes.set(path.join(SERVER, p), fake);
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SERVER) && !key.includes(`${path.sep}tests${path.sep}`)) {
      delete require.cache[key];
    }
  }
  return require(path.join(SERVER, rel));
}

const seeded = [
  { code: 'CSE', name: 'Computer Science & Engineering', isAll: false, aliases: ['cs', 'computer', 'cse'] },
  { code: 'ELECTRONICS', name: 'Electronics Engineering', isAll: false, aliases: ['electronics', 'ece'] },
  { code: 'ALL', name: 'All Departments', isAll: true, aliases: [] },
];

function fakeDepartmentModel(docs = seeded) {
  return {
    find: (q = {}) => ({
      lean: async () => docs.filter((d) => (q.active !== undefined ? true : true)),
      sort: () => ({ lean: async () => docs }),
    }),
    findOne: async (q) => docs.find((d) => d.code === q.code) || null,
  };
}

const mockStudent = {
  id: '507f1f77bcf86cd799439011',
  name: 'Pritam Giri',
  department: 'CSE',
  semester: 3,
  rollNumber: '250101',
};

const stub = {
  find: () => ({
    sort: () => ({ limit: async () => [] }),
    limit: async () => [],
    select: async () => [],
  }),
  findOne: async () => null,
};

test('TEST 1: Who is the CSE HOD? -> Real database lookup', async () => {
  let queriedFilter = null;
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': stub,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Practical': stub,
      'models/Assignment': stub,
      'models/Document': stub,
      'models/Faculty': {
        findOne: async (q) => {
          queriedFilter = q;
          return { name: 'Dr. Raj Kumar', designation: 'HOD & Professor', qualification: 'Ph.D.', department: 'CSE' };
        },
      },
    },
  });

  const res = await handleMessage('Who is the CSE HOD?', mockStudent);
  assert.equal(queriedFilter.department, 'CSE');
  assert.equal(queriedFilter.isHOD, true);
  assert.match(res.reply, /Dr\. Raj Kumar/);
  assert.equal(res.sources[0].category, 'faculty');
  assert.equal(res.sources[0].title, 'CSE Faculty Directory');
  assert.doesNotMatch(res.reply, /experienced professor with 15 years/);
});

test('HOD lookup follows the requested department and permits cross-department questions', async () => {
  const facultyQueries = [];
  const faculty = {
    findOne: async (query) => {
      facultyQueries.push(query);
      return query.department === 'CSE'
        ? { name: 'Dr. Raj Kumar' }
        : { name: 'Electronics HOD' };
    },
  };
  const createBot = () => loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': stub,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Practical': stub,
      'models/Assignment': stub,
      'models/Document': stub,
      'models/Faculty': faculty,
    },
  }).handleMessage;

  const cseStudent = { ...mockStudent, department: 'CSE' };
  let handleMessage = createBot();
  for (const question of ['Who is our HOD?', 'Who is the CSE HOD?', 'Who is the HOD of CSE?']) {
    const result = await handleMessage(question, cseStudent);
    assert.match(result.reply, /Dr\. Raj Kumar/);
    assert.equal(result.department, 'CSE');
  }

  const crossDepartment = await handleMessage('Who is the Electronics HOD?', cseStudent);
  assert.match(crossDepartment.reply, /Electronics HOD/);
  assert.equal(facultyQueries.at(-1).department, 'ELECTRONICS');

  const electronicsStudent = { ...mockStudent, department: 'ELECTRONICS' };
  handleMessage = createBot();
  for (const question of ['Who is our HOD?', 'Who is the Electronics HOD?']) {
    const result = await handleMessage(question, electronicsStudent);
    assert.match(result.reply, /Electronics HOD/);
    assert.equal(result.department, 'ELECTRONICS');
  }
  const reverseCrossDepartment = await handleMessage('Who is the CSE HOD?', electronicsStudent);
  assert.match(reverseCrossDepartment.reply, /Dr\. Raj Kumar/);
  assert.equal(facultyQueries.at(-1).department, 'CSE');
});

test('TEST 2: What is recursion? -> Department and intent detection then Gemini', async () => {
  let casualResponseCalled = false;
  let departmentReads = 0;

  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(seeded, { finds: 0 }),
      'models/Notice': stub,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Practical': stub,
      'models/Assignment': stub,
      'models/Document': stub,
      'models/Faculty': stub,
      'services/aiService': { hasEmbeddingApiKey: false },
      'services/knowledgeRetrievalService': { searchRelevantChunks: async () => [] },
      'services/geminiService': {
        generateCasualResponse: async (msg, student) => {
          casualResponseCalled = true;
          assert.equal(msg, 'What is recursion?');
          assert.equal(student, mockStudent);
          return 'Recursion is a programming technique where a function calls itself to solve a smaller instance of the same problem.';
        },
      },
      'services/departmentService': {
        ALL_CODE: 'ALL',
        getActiveDepartments: async () => { departmentReads += 1; return seeded; },
      },
    },
  });

  const res = await handleMessage('What is recursion?', mockStudent);
  assert.equal(casualResponseCalled, true);
  assert.equal(departmentReads, 1);
  assert.match(res.reply, /Recursion is a programming technique/);
  assert.doesNotMatch(res.reply, /college database/i);
});

test('general follow-up questions pass recent conversation to Gemini after department detection', async () => {
  const history = [
    { role: 'user', content: 'What is recursion?' },
    { role: 'assistant', content: 'A function calling itself.' },
    { role: 'user', content: 'Explain it with an example.' },
  ];
  let receivedHistory;
  let departmentReads = 0;
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(seeded),
      'models/Notice': stub,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Practical': stub,
      'models/Assignment': stub,
      'models/Document': stub,
      'models/Faculty': stub,
      'services/departmentService': {
        ALL_CODE: 'ALL',
        getActiveDepartments: async () => { departmentReads += 1; return seeded; },
      },
      'services/geminiService': {
        generateCasualResponse: async (_message, _student, recent) => { receivedHistory = recent; return 'Here is an example.'; },
      },
    },
  });

  const res = await handleMessage('Explain it with an example.', mockStudent, history);
  assert.equal(res.reply, 'Here is an example.');
  assert.equal(receivedHistory, history);
  assert.equal(departmentReads, 1);
});

test('general AI uses Groq once with the configured model and returns its completion', async () => {
  let calls = 0;
  const previousKey = process.env.GROQ_API_KEY;
  const previousProvider = process.env.AI_PROVIDER;
  process.env.GROQ_API_KEY = 'test-only-groq-key';
  process.env.AI_PROVIDER = 'groq';
  const { generateCasualResponse } = loadFresh('services/geminiService', {
    bare: {
      'groq-sdk': class {
        constructor() {
          this.chat = { completions: {
            create: async (parameters) => {
              calls += 1;
              assert.equal(parameters.model, 'openai/gpt-oss-120b');
              assert.equal(parameters.messages[0].role, 'system');
              assert.equal(parameters.messages.at(-1).role, 'user');
              assert.match(parameters.messages.at(-1).content, /What is speed of light\?/);
              return { choices: [{ message: { content: 'Groq response.' } }] };
            },
          } };
        }
      },
    },
  });
  if (previousKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = previousKey;
  if (previousProvider === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = previousProvider;

  const response = await generateCasualResponse('What is speed of light?');

  assert.equal(response, 'Groq response.');
  assert.equal(calls, 1);
});

test('greetings return before department lookup or Gemini', async () => {
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'services/departmentService': {
        ALL_CODE: 'ALL',
        getActiveDepartments: async () => { throw new Error('greeting should not query departments'); },
      },
      'services/geminiService': {
        generateCasualResponse: async () => { throw new Error('greeting should not call Gemini'); },
      },
    },
  });

  for (const greeting of ['hi', 'hello', 'hey', 'hii', 'hiii', 'namaste']) {
    const result = await handleMessage(greeting, mockStudent);
    assert.match(result.reply, /Welcome back, Pritam Giri/);
  }
});

test('TEST 3: What are my assignments? -> Queries CSE Semester 3 published assignments without section', async () => {
  let assignmentFilter = null;
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': stub,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Practical': stub,
      'models/Faculty': stub,
      'models/Document': stub,
      'models/Assignment': {
        find: (q) => {
          assignmentFilter = q;
          return {
            sort: () => ({
              limit: async () => [
                {
                  title: 'Data Structures Assignment 1',
                  subject: 'Data Structures',
                  dueDate: new Date('2026-09-30'),
                  totalMarks: 20,
                  instructions: 'Implement linked list operations.',
                },
                {
                  title: 'Computer Networks Assignment 1',
                  subject: 'Computer Networks',
                  dueDate: new Date('2026-10-03'),
                  totalMarks: 20,
                },
              ],
            }),
          };
        },
      },
    },
  });

  const res = await handleMessage('What are my assignments?', mockStudent);
  assert.deepEqual(assignmentFilter.department, { $in: ['CSE', 'ALL'] });
  assert.equal(assignmentFilter.semester, 3);
  assert.equal(assignmentFilter.status, 'published');
  assert.equal(assignmentFilter.section, undefined); // NO SECTION

  assert.match(res.reply, /Data Structures Assignment 1/);
  assert.match(res.reply, /Computer Networks Assignment 1/);
  assert.match(res.reply, /30 Sept? 2026/);
});

test('TEST 4: What are my practicals? -> Queries CSE Semester 3 published practicals', async () => {
  let practicalFilter = null;
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': stub,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Assignment': stub,
      'models/Faculty': stub,
      'models/Document': stub,
      'models/Practical': {
        find: (q) => {
          practicalFilter = q;
          return {
            sort: () => ({
              limit: async () => [
                {
                  title: 'Data Structures Lab Experiment 1',
                  subject: 'Data Structures Lab',
                  dueDate: new Date('2026-10-05'),
                  totalMarks: 25,
                },
              ],
            }),
          };
        },
      },
    },
  });

  const res = await handleMessage('What are my practicals?', mockStudent);
  assert.deepEqual(practicalFilter.department, { $in: ['CSE', 'ALL'] });
  assert.equal(practicalFilter.semester, 3);
  assert.equal(practicalFilter.status, 'published');
  assert.equal(practicalFilter.section, undefined); // NO SECTION
  assert.match(res.reply, /Data Structures Lab Experiment 1/);
});

test('TEST 5: Who is the Electronics HOD? -> Unavailable record returns honest error, never guesses', async () => {
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': stub,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Assignment': stub,
      'models/Practical': stub,
      'models/Document': stub,
      'models/Faculty': {
        findOne: async () => null, // No record in database
      },
      'services/geminiService': {
        generateAIResponse: async () => {
          throw new Error('Gemini should NOT be called to guess missing college HOD records');
        },
      },
    },
  });

  const res = await handleMessage('Who is the Electronics HOD?', mockStudent);
  assert.match(res.reply, /I don't have the ELECTRONICS HOD information in the college records yet/i);
  assert.match(res.reply, /college administration/i);
});

test('TEST 6: Tell me the college holiday tomorrow -> Missing record does not hallucinate', async () => {
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': {
        find: () => ({
          sort: () => ({
            limit: async () => [], // No holiday notices
          }),
        }),
      },
      'models/KnowledgeBase': {
        find: () => ({
          limit: async () => [], // No holiday KB
        }),
      },
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/Assignment': stub,
      'models/Practical': stub,
      'models/Document': stub,
      'models/Faculty': stub,
      'services/aiService': { hasEmbeddingApiKey: false },
      'services/knowledgeRetrievalService': { searchRelevantChunks: async () => [] },
      'services/geminiService': {
        generateAIResponse: async () => {
          throw new Error('Gemini should NOT hallucinate unrecorded holidays');
        },
      },
    },
  });

  const res = await handleMessage('Tell me the college holiday tomorrow.', mockStudent);
  assert.match(res.reply, /I don't have current holiday information in the college records/i);
  assert.match(res.reply, /college administration/i);
});

test('TEST 7: Follow-up question: What subjects does he teach? -> Contextual pronoun resolution', async () => {
  const history = [
    { role: 'user', content: 'Who is the CSE HOD?' },
    { role: 'assistant', content: 'The Head of Department for CSE is Dr. Raj Kumar.' },
  ];

  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Assignment': stub,
      'models/Practical': stub,
      'models/Document': stub,
      'models/Faculty': {
        findOne: async () => ({
          _id: '607f1f77bcf86cd799439099',
          name: 'Dr. Raj Kumar',
          department: 'CSE',
          isHOD: true,
        }),
      },
      'models/Timetable': {
        find: () => ({
          select: async () => [
            {
              slots: [
                {
                  faculty: '607f1f77bcf86cd799439099',
                  subject: 'Data Structures',
                },
                {
                  faculty: '607f1f77bcf86cd799439099',
                  subject: 'Advanced Algorithms',
                },
              ],
            },
          ],
        }),
      },
      'services/aiService': { hasEmbeddingApiKey: false },
      'services/knowledgeRetrievalService': { searchRelevantChunks: async () => [] },
    },
  });

  const res = await handleMessage('What subjects does he teach?', mockStudent, history);
  assert.match(res.reply, /Dr\. Raj Kumar teaches/i);
  assert.match(res.reply, /Data Structures/);
  assert.match(res.reply, /Advanced Algorithms/);
});

test('Semester detection: strictly 1 through 6, rejects > 6', () => {
  const { detectSemester } = loadFresh('chatbot/chatbotService', {
    paths: { 'models/Department': fakeDepartmentModel() },
  });
  assert.equal(detectSemester('semester 1'), 1);
  assert.equal(detectSemester('sem 3'), 3);
  assert.equal(detectSemester('6th semester'), 6);
  assert.equal(detectSemester('first semester'), 1);
  assert.equal(detectSemester('third semester'), 3);
  assert.equal(detectSemester('sixth semester'), 6);
  assert.equal(detectSemester('semester 7'), null);
  assert.equal(detectSemester('semester 8'), null);
  assert.equal(detectSemester('semester 12'), null);
});

test('Student profile questions: answered directly from authenticated context', async () => {
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': stub,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Practical': stub,
      'models/Assignment': stub,
      'models/Document': stub,
      'models/Faculty': stub,
    },
  });

  const semRes = await handleMessage('What semester am I in?', mockStudent);
  assert.match(semRes.reply, /Semester 3/);

  const deptRes = await handleMessage('What is my department?', mockStudent);
  assert.match(deptRes.reply, /CSE/);

  const rollRes = await handleMessage('What is my roll number?', mockStudent);
  assert.match(rollRes.reply, /250101/);

  const profileRes = await handleMessage('Who am I?', mockStudent);
  assert.match(profileRes.reply, /Pritam Giri/);
  assert.match(profileRes.reply, /CSE/);
  assert.match(profileRes.reply, /Semester 3/);
});

test('detectSection always returns null (no section system)', () => {
  const { detectSection } = loadFresh('chatbot/chatbotService', {
    paths: { 'models/Department': fakeDepartmentModel() },
  });
  assert.equal(detectSection('section A'), null);
  assert.equal(detectSection(), null);
});

test('FAQ and knowledge-base answers include their records as sources', async () => {
  const faq = { question: 'What are the college timings?', answer: 'Timings are posted by administration.', department: 'ALL', createdAt: new Date('2026-09-01') };
  const knowledge = { title: 'College Hours Policy', content: 'The current hours are published by administration.', department: 'ALL', createdAt: new Date('2026-09-02') };
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': stub,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': { find: () => ({ limit: async () => [faq] }) },
      'models/KnowledgeBase': { find: () => ({ limit: async () => [knowledge] }) },
      'models/Practical': stub,
      'models/Assignment': stub,
      'models/Document': stub,
      'models/Faculty': stub,
      'services/aiService': { hasEmbeddingApiKey: false },
      'services/knowledgeRetrievalService': { searchRelevantChunks: async () => [] },
      'services/geminiService': {
        generateAIResponse: async (_question, context) => `Grounded context: ${context}`,
        generateCasualResponse: async () => 'casual',
      },
    },
  });

  const result = await handleMessage('What are the college timings?', mockStudent);
  assert.match(result.reply, /Grounded context/);
  assert.deepEqual(result.sources.map((source) => source.category), ['faq', 'knowledge-base']);
  assert.deepEqual(result.sources.map((source) => source.title), [faq.question, knowledge.title]);
});

test('notice answers query only visible department records that have not expired', async () => {
  let noticeFilter;
  const { handleMessage } = loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(),
      'models/Notice': { find: (filter) => {
        noticeFilter = filter;
        return { sort: () => ({ limit: async () => [] }) };
      } },
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
      'models/Practical': stub,
      'models/Assignment': stub,
      'models/Document': stub,
      'models/Faculty': stub,
      'services/aiService': { hasEmbeddingApiKey: false },
      'services/knowledgeRetrievalService': { searchRelevantChunks: async () => [] },
    },
  });

  await handleMessage('What are the latest CSE notices?', mockStudent);
  assert.deepEqual(noticeFilter.department, { $in: ['CSE', 'ALL'] });
  const expiryFilter = noticeFilter.$and[0].$or;
  assert.equal(expiryFilter[0].expiresAt, null);
  assert.ok(expiryFilter[1].expiresAt.$gt instanceof Date);
});

