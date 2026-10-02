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

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('chat API saves the exchange and returns the assistant reply with sources', async () => {
  const id = '507f1f77bcf86cd799439011';
  const user = {
    _id: { toString: () => id },
    name: 'Test Student',
    email: 'student@example.test',
    role: 'student',
    department: 'CSE',
    semester: 3,
    rollNumber: 'R-1',
  };
  const conversation = {
    _id: id,
    title: 'Who is my HOD?',
    save: async () => {},
  };
  const savedMessages = [];
  const sources = [{ title: 'CSE Faculty List', category: 'faculty', department: 'CSE' }];
  let receivedQuestion;
  let receivedStudent;
  const controller = loadFresh('controllers/chatController', {
    paths: {
      'models/User': { findById: async () => user },
      'models/Conversation': { create: async () => conversation, findOne: async () => conversation },
      'models/Message': {
        create: async (data) => {
          const saved = { ...data, _id: `message-${savedMessages.length}`, createdAt: new Date() };
          savedMessages.push(saved);
          return saved;
        },
        find: () => ({
          sort: () => ({ limit: () => ({ lean: async () => savedMessages.slice(-6) }) }),
        }),
      },
      'chatbot/chatbotService': {
        handleMessage: async (message, student) => {
          receivedQuestion = message;
          receivedStudent = student;
          return { reply: 'Your CSE HOD is listed in the faculty directory.', department: 'CSE', sources };
        },
      },
    },
  });
  const res = fakeResponse();
  let receivedError;

  await controller.chat(
    { body: { message: '  Who is my HOD?  ' }, user: { _id: id } },
    res,
    (error) => { receivedError = error; }
  );

  assert.equal(receivedError, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(receivedQuestion, 'Who is my HOD?');
  assert.equal(receivedStudent.department, 'CSE');
  assert.deepEqual(savedMessages.map((message) => message.role), ['user', 'assistant']);
  assert.equal(res.body.data.reply, 'Your CSE HOD is listed in the faculty directory.');
  assert.deepEqual(res.body.data.sources, sources);
  assert.equal(res.body.data.conversationId, id);
});

test('chat API rejects blank and oversized messages before database access', async () => {
  let databaseTouched = false;
  const controller = loadFresh('controllers/chatController', {
    paths: {
      'models/User': { findById: async () => { databaseTouched = true; return null; } },
      'models/Conversation': {},
      'models/Message': {},
      'chatbot/chatbotService': { handleMessage: async () => ({ reply: '' }) },
    },
  });

  for (const message of ['', ' '.repeat(2), 'x'.repeat(4001)]) {
    let receivedError;
    await controller.chat({ body: { message }, user: { _id: 'student-id' } }, fakeResponse(), (error) => {
      receivedError = error;
    });
    assert.equal(receivedError.statusCode, 400);
  }
  assert.equal(databaseTouched, false);
});

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

test('faculty questions search the named department, including cross-department requests', async () => {
  const queries = [];
  const faculty = {
    find: (query) => ({
      sort: () => ({
        limit: async () => {
          queries.push(query);
          return [{
            name: `SAMPLE / DEVELOPMENT DATA ${query.department} Faculty`,
            designation: 'Sample instructor',
            department: query.department,
            isHOD: true,
          }];
        },
      }),
    }),
  };
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
      'models/Faculty': faculty,
    },
  });

  const cseStudent = { ...mockStudent, department: 'CSE' };
  const cseResult = await handleMessage('CSE ke faculty kaun hain?', cseStudent);
  assert.deepEqual(queries.at(-1), { department: 'CSE' });
  assert.match(cseResult.reply, /SAMPLE \/ DEVELOPMENT DATA CSE Faculty/);
  assert.equal(cseResult.sources[0].category, 'faculty');

  const electronicsResult = await handleMessage('Electronics ke faculty kaun hain?', cseStudent);
  assert.deepEqual(queries.at(-1), { department: 'ELECTRONICS' });
  assert.match(electronicsResult.reply, /SAMPLE \/ DEVELOPMENT DATA ELECTRONICS Faculty/);
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

test('PDF retrieval grounds college answers, returns source links, and refuses when no chunks match', async () => {
  const retrievedChunk = {
    content: 'Students must maintain the attendance required by the current academic rules.',
    score: 0.88,
    source: {
      title: 'CSE Student Handbook',
      category: 'handbook',
      department: 'CSE',
      url: 'https://files.example/cse-handbook.pdf',
      uploadedAt: new Date('2026-09-01'),
    },
  };
  let chunks = [retrievedChunk];
  let generationCalls = 0;
  let receivedContext = '';
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
      'services/aiService': { hasEmbeddingApiKey: true },
      'services/knowledgeRetrievalService': { searchRelevantChunks: async () => chunks },
      'services/geminiService': {
        generateAIResponse: async (_message, context) => {
          generationCalls += 1;
          receivedContext = context;
          return 'The handbook says students must follow the attendance requirements.';
        },
        generateCasualResponse: async () => 'unused',
      },
    },
  });

  const question = 'What does the CSE student handbook say about attendance rules?';
  const grounded = await handleMessage(question, mockStudent);
  assert.equal(generationCalls, 1);
  assert.match(receivedContext, /\[Source: CSE Student Handbook\]/);
  assert.match(receivedContext, /attendance required/);
  assert.match(grounded.reply, /attendance requirements/);
  assert.deepEqual(grounded.sources, [retrievedChunk.source]);

  chunks = [];
  const missing = await handleMessage(question, mockStudent);
  assert.equal(generationCalls, 1);
  assert.match(missing.reply, /could not find relevant text/i);
  assert.deepEqual(missing.sources, []);
});

test('timetable, syllabus, and document queries return department-filtered records with sources', async () => {
  const scenarios = [
    {
      model: 'Timetable',
      question: 'Show me the CSE timetable for semester 3',
      record: { department: 'CSE', semester: 3, section: 'A', day: 'MON', slots: [{ time: '09:00-10:00', subject: 'Data Structures' }] },
      expectedFilter: { department: 'CSE', semester: 3 },
      expectedCategory: 'timetable',
      expectedTitle: 'CSE Semester 3 Timetable',
    },
    {
      model: 'Timetable',
      question: 'Electronics ka timetable batao.',
      record: { department: 'ELECTRONICS', semester: 3, section: 'A', day: 'TUE', slots: [{ time: '09:00-10:00', subject: 'SAMPLE / DEVELOPMENT DATA: Digital Electronics' }] },
      expectedFilter: { department: 'ELECTRONICS', semester: 3 },
      expectedCategory: 'timetable',
      expectedTitle: 'ELECTRONICS Semester 3 Timetable',
    },
    {
      model: 'Syllabus',
      question: 'Show me the CSE syllabus for semester 3',
      record: { department: 'CSE', semester: 3, subjectName: 'Data Structures', subjectCode: 'CS301', fileUrl: 'https://files.example/cse-syllabus.pdf' },
      expectedFilter: { department: 'CSE', semester: 3 },
      expectedCategory: 'syllabus',
      expectedTitle: 'Data Structures Syllabus',
      expectedUrl: 'https://files.example/cse-syllabus.pdf',
    },
    {
      model: 'Document',
      question: 'Show all CSE PDF documents',
      record: { department: 'CSE', title: 'CSE Student Handbook', category: 'handbook', fileUrl: 'https://files.example/cse-handbook.pdf' },
      expectedFilter: { department: { $in: ['CSE', 'ALL'] } },
      expectedCategory: 'document',
      expectedTitle: 'CSE Student Handbook',
      expectedUrl: 'https://files.example/cse-handbook.pdf',
    },
  ];

  for (const scenario of scenarios) {
    let receivedFilter;
    const query = {
      populate: () => query,
      sort: () => query,
      limit: async () => [scenario.record],
    };
    const modelStub = {
      find: (filter) => {
        receivedFilter = filter;
        if (scenario.model === 'Syllabus') return { sort: async () => [scenario.record] };
        return query;
      },
    };
    const { handleMessage } = loadFresh('chatbot/chatbotService', {
      paths: {
        'models/Department': fakeDepartmentModel(),
        'models/Notice': stub,
        'models/Timetable': scenario.model === 'Timetable' ? modelStub : stub,
        'models/Syllabus': scenario.model === 'Syllabus' ? modelStub : stub,
        'models/FAQ': stub,
        'models/KnowledgeBase': stub,
        'models/Practical': stub,
        'models/Assignment': stub,
        'models/Document': scenario.model === 'Document' ? modelStub : stub,
        'models/Faculty': stub,
        'services/departmentService': {
          ALL_CODE: 'ALL',
          getActiveDepartments: async () => seeded,
          buildVisibilityFilter: (department) => department
            ? { department: { $in: [department, 'ALL'] } }
            : { department: 'ALL' },
        },
        'services/aiService': { hasEmbeddingApiKey: false },
        'services/knowledgeRetrievalService': { searchRelevantChunks: async () => [] },
      },
    });

    const result = await handleMessage(scenario.question, mockStudent);
    assert.deepEqual(receivedFilter, scenario.expectedFilter, scenario.model);
    assert.equal(result.sources[0].category, scenario.expectedCategory, scenario.model);
    assert.equal(result.sources[0].title, scenario.expectedTitle, scenario.model);
    if (scenario.expectedUrl) assert.equal(result.sources[0].url, scenario.expectedUrl, scenario.model);
  }
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

test('college-wide latest notice queries include all department records', async () => {
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

  await handleMessage('College ke latest notices kya hain?', mockStudent);
  assert.equal(noticeFilter.department, undefined);
  assert.ok(noticeFilter.$and[0].$or[1].expiresAt.$gt instanceof Date);
});

