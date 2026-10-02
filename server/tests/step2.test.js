// tests/step2.test.js
//
// Run with:  npm test      (uses Node's built-in test runner, nothing to install)
//
// These tests need NO database and NO running server. Where a module needs
// mongoose / express / jsonwebtoken, a tiny stand-in ("fake") is injected
// instead, so we test OUR logic in isolation.
//
// Any names/data below are DEMO test data, not real college data.

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('path');

const SERVER = path.resolve(__dirname, '..');
process.env.GEMINI_API_KEY ||= 'test-only-key';

// ---------------------------------------------------------------------------
// Tiny module-faking helper
// ---------------------------------------------------------------------------
const bareFakes = new Map(); // e.g. 'jsonwebtoken'  -> fake
const pathFakes = new Map(); // absolute path (no .js) -> fake

const originalLoad = Module._load;
Module._load = function (request, parent) {
  if (bareFakes.has(request)) return bareFakes.get(request);
  if (request.startsWith('.') && parent && parent.filename) {
    const abs = path.resolve(path.dirname(parent.filename), request).replace(/\.js$/, '');
    if (pathFakes.has(abs)) return pathFakes.get(abs);
  }
  return originalLoad.apply(this, arguments);
};

// Loads a server module fresh, with the given fakes active.
//   bare  = { 'package-name': fake }
//   paths = { 'relative/path/from/server': fake }
function loadFresh(rel, { bare = {}, paths = {} } = {}) {
  bareFakes.clear();
  pathFakes.clear();
  for (const [name, fake] of Object.entries(bare)) bareFakes.set(name, fake);
  for (const [p, fake] of Object.entries(paths)) pathFakes.set(path.join(SERVER, p), fake);
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SERVER) && !key.includes(`${path.sep}tests${path.sep}`)) delete require.cache[key];
  }
  return require(path.join(SERVER, rel));
}

// A fake Department model that returns the given documents.
function fakeDepartmentModel(docs, counter = { finds: 0 }) {
  return {
    find() {
      counter.finds += 1;
      return { lean: async () => docs, sort: () => ({ lean: async () => docs }) };
    },
  };
}

const { INITIAL_DEPARTMENTS } = require('../seed/departmentData');
const seeded = INITIAL_DEPARTMENTS.map((d) => ({ ...d, active: true }));
// A hypothetical future department, to prove nothing is hard-coded.
const MECHANICAL = { code: 'ME', name: 'Mechanical Engineering', isAll: false, active: true, aliases: ['mechanical', 'mech'] };

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

// ---------------------------------------------------------------------------
// utils/text.js — whole-word matching
// ---------------------------------------------------------------------------
test('text: whole-word matching only', () => {
  const { containsPhrase, normalizeText, escapeRegex } = loadFresh('utils/text');
  assert.equal(normalizeText('Computer Science & Engineering!'), 'computer science and engineering');
  assert.equal(containsPhrase('Show me the recent notices', 'ece'), false); // inside "recent"
  assert.equal(containsPhrase('Is it necessary?', 'ece'), false); // inside "necessary"
  assert.equal(containsPhrase('ECE notice please', 'ece'), true);
  assert.equal(containsPhrase('physics syllabus', 'cs'), false);
  assert.equal(containsPhrase('exam method', 'hod'), false);
  assert.equal(containsPhrase('anything', ''), false); // empty phrase never matches
  assert.equal(escapeRegex('a.b(c)'), 'a\\.b\\(c\\)');
});

test('text: keeps non-English letters intact', () => {
  const { normalizeText } = loadFresh('utils/text');
  assert.equal(normalizeText('विभाग की सूचना'), 'विभाग की सूचना');
});

test('pagination: safe defaults and limits', () => {
  const { getPagination } = loadFresh('utils/pagination');
  assert.deepEqual(getPagination({}), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(getPagination({ page: '3', limit: '500' }), { page: 3, limit: 100, skip: 200 });
  assert.deepEqual(getPagination({ page: '-4', limit: 'abc' }), { page: 1, limit: 20, skip: 0 });
});

// ---------------------------------------------------------------------------
// chatbot/departmentDetector.js — the confirmed Step 1 bugs
// ---------------------------------------------------------------------------
async function detectWith(depts, message) {
  const { detectDepartment } = loadFresh('chatbot/departmentDetector', {
    paths: { 'services/departmentService': { getActiveDepartments: async () => depts } },
  });
  return detectDepartment(message);
}

test('detector: the required examples', async () => {
  assert.equal(await detectWith(seeded, 'What is the CSE timetable?'), 'CSE');
  assert.equal(await detectWith(seeded, 'Electronics ka timetable batao'), 'ELECTRONICS');
  assert.equal(await detectWith(seeded, 'Latest college notice?'), null);
  assert.equal(await detectWith(seeded, 'Who is the CSE HOD?'), 'CSE');
  assert.equal(await detectWith(seeded, 'Computer Science and Engineering syllabus'), 'CSE');
  assert.equal(await detectWith(seeded, 'CS ka timetable batao'), 'CSE'); // was null before
  assert.equal(await detectWith(seeded, 'ECE notice'), 'ELECTRONICS');
  assert.equal(await detectWith(seeded, 'electronic department notice'), 'ELECTRONICS');
});

test('detector: bug fixes — no more substring false positives', async () => {
  assert.equal(await detectWith(seeded, 'Show me the recent notices'), null); // was ELECTRONICS
  assert.equal(await detectWith(seeded, 'Is it necessary to attend?'), null); // was ELECTRONICS
  assert.equal(await detectWith(seeded, 'physics syllabus'), null);
});

test('detector: college-wide hint wins, bad input is safe', async () => {
  assert.equal(await detectWith(seeded, 'college ka CSE notice'), null);
  assert.equal(await detectWith(seeded, ''), null);
  assert.equal(await detectWith(seeded, undefined), null);
  assert.equal(await detectWith(seeded, { $ne: 1 }), null);
});

test('detector: two departments in one message', async () => {
  const { detectDepartments, detectDepartment } = loadFresh('chatbot/departmentDetector', {
    paths: { 'services/departmentService': { getActiveDepartments: async () => seeded } },
  });
  assert.deepEqual(await detectDepartments('CSE and Electronics timetable'), ['CSE', 'ELECTRONICS']);
  assert.deepEqual(await detectDepartments('Electronics and CSE timetable'), ['ELECTRONICS', 'CSE']);
  assert.equal(await detectDepartment('Electronics and CSE timetable'), 'ELECTRONICS'); // first mentioned
});

test('detector: a NEW department works with no code change, and short codes do not misfire', async () => {
  const withMech = [...seeded, MECHANICAL];
  assert.equal(await detectWith(withMech, 'Mechanical timetable'), 'ME');
  assert.equal(await detectWith(withMech, 'mech notice'), 'ME');
  assert.equal(await detectWith(withMech, 'Mechanical Engineering faculty'), 'ME'); // via its name
  assert.equal(await detectWith(withMech, 'Show me the library timings'), null); // "me" / "timetable" no longer match
  assert.equal(await detectWith(withMech, 'CS ka timetable batao'), 'CSE');
});

test('detector: a deactivated department is not matched', async () => {
  // getActiveDepartments never returns inactive ones, so simulate that
  const onlyCse = seeded.filter((d) => d.code !== 'ELECTRONICS');
  assert.equal(await detectWith(onlyCse, 'Electronics timetable'), null);
});

// ---------------------------------------------------------------------------
// chatbot/chatbotService.js — the minimal Step 2 fixes
// ---------------------------------------------------------------------------
function loadChatbot(depts, faculty = { findOne: async () => null }) {
  const stub = { find: () => ({ sort: () => ({ limit: async () => [] }), limit: async () => [] }) };
  return loadFresh('chatbot/chatbotService', {
    paths: {
      'models/Department': fakeDepartmentModel(depts),
      'models/Notice': stub,
      'models/Faculty': faculty,
      'models/Timetable': stub,
      'models/Syllabus': stub,
      'models/FAQ': stub,
      'models/KnowledgeBase': stub,
    },
  });
}

test('chatbot intent: whole words only', () => {
  const { detectIntent } = loadChatbot(seeded);
  assert.equal(detectIntent('Who is the CSE HOD?'), 'HOD_LOOKUP');
  assert.equal(detectIntent('H.O.D. of electronics'), 'HOD_LOOKUP');
  assert.equal(detectIntent('What is the exam method?'), 'GENERAL_QUERY'); // was HOD_LOOKUP
  assert.equal(detectIntent('show time table'), 'TIMETABLE');
  assert.equal(detectIntent('latest notices'), 'NOTICE');
  assert.equal(detectIntent('CSE syllabus'), 'SYLLABUS');
  assert.equal(detectIntent('library timings'), 'GENERAL_QUERY');
});

test('chatbot: department question names come from the database, not the code', async () => {
  let asked;
  const { handleMessage } = loadChatbot([...seeded, MECHANICAL], {
    findOne: async (q) => {
      asked = q;
      return { name: 'DEMO Faculty Name' };
    },
  });

  const noDept = await handleMessage('HOD kaun hai?');
  assert.equal(noDept.needsDepartment, true);
  assert.match(noDept.reply, /Computer Science & Engineering/);
  assert.match(noDept.reply, /Electronics/);
  assert.match(noDept.reply, /Mechanical Engineering/); // third department appears automatically
  assert.doesNotMatch(noDept.reply, /All Departments/); // "ALL" is not offered as a choice

  const withDept = await handleMessage('Who is the CSE HOD?');
  assert.deepEqual(asked, { department: 'CSE', isHOD: true });
  assert.match(withDept.reply, /DEMO Faculty Name/);
});

// ---------------------------------------------------------------------------
// services/departmentService.js
// ---------------------------------------------------------------------------
test('departmentService: validation, filters, caching', async () => {
  const counter = { finds: 0 };
  const svc = loadFresh('services/departmentService', {
    paths: { 'models/Department': fakeDepartmentModel(seeded, counter) },
  });

  assert.equal(await svc.isValidDepartment('cse'), true); // case-insensitive
  assert.equal(await svc.isValidDepartment(' ELECTRONICS '), true);
  assert.equal(await svc.isValidDepartment('ALL'), true);
  assert.equal(await svc.isValidDepartment('MECHANICAL'), false);
  assert.equal(await svc.isValidDepartment(undefined), false);
  assert.equal(await svc.isValidDepartment({ $ne: null }), false);
  assert.equal(counter.finds, 1, 'the department list is cached between calls');
  svc.invalidateCache();
  await svc.isValidDepartment('CSE');
  assert.equal(counter.finds, 2, 'invalidateCache forces a reload');

  assert.deepEqual(svc.buildVisibilityFilter('cse'), { department: { $in: ['CSE', 'ALL'] } });
  assert.deepEqual(svc.buildVisibilityFilter(null), { department: 'ALL' });
  assert.deepEqual(svc.buildExactFilter('cse'), { department: 'CSE' });
  assert.deepEqual(svc.buildExactFilter(undefined), {});
  // NoSQL-injection attempt is neutralised
  assert.deepEqual(svc.buildVisibilityFilter({ $ne: 'x' }), { department: { $in: ['[OBJECT OBJECT]', 'ALL'] } });
});

test('departmentService: alias cleaning rejects risky aliases', () => {
  const svc = loadFresh('services/departmentService', {
    paths: { 'models/Department': fakeDepartmentModel([]) },
  });
  assert.deepEqual(svc.findInvalidAliases(['me', 'Mechanical', 'a', 'it']), ['me', 'a', 'it']);
  assert.deepEqual(svc.cleanAliases([' CS ', 'cs', 'Mechanical', 'me', '', '  ']), ['cs', 'mechanical']);
  assert.deepEqual(svc.cleanAliases('not an array'), []);
});

test('seed data: 3 departments, exactly one ALL, aliases cover the required phrases', () => {
  assert.equal(INITIAL_DEPARTMENTS.length, 3);
  assert.equal(INITIAL_DEPARTMENTS.filter((d) => d.isAll).length, 1);
  const cse = INITIAL_DEPARTMENTS.find((d) => d.code === 'CSE').aliases;
  const ece = INITIAL_DEPARTMENTS.find((d) => d.code === 'ELECTRONICS').aliases;
  for (const a of ['cse', 'cs', 'computer science', 'computer science and engineering']) assert.ok(cse.includes(a), a);
  for (const a of ['electronics', 'ece', 'electronic']) assert.ok(ece.includes(a), a);
});

// ---------------------------------------------------------------------------
// plugins/departmentPlugin.js
// ---------------------------------------------------------------------------
function applyPlugin(options) {
  const plugin = loadFresh('plugins/departmentPlugin', {
    paths: {
      'services/departmentService': {
        isValidDepartment: async (v) => ['CSE', 'ELECTRONICS', 'ALL'].includes(String(v).toUpperCase()),
      },
    },
  });
  const captured = { hooks: [] };
  const schema = {
    add(def) {
      captured.definition = def;
    },
    path() {
      return { validate: (fn) => (captured.validator = fn) };
    },
    pre(events, fn) {
      captured.hooks.push({ events, fn });
    },
    index() {},
  };
  plugin(schema, options);
  return captured;
}

test('plugin: required by default, optional on request, validates against the service', async () => {
  const strict = applyPlugin();
  assert.equal(strict.definition.department.required, true);
  assert.equal(await strict.validator('CSE'), true);
  assert.equal(await strict.validator('MECHANICAL'), false);
  assert.equal(await strict.validator(''), false);

  const optional = applyPlugin({ required: false });
  assert.equal(optional.definition.department.required, false);
  assert.equal(await optional.validator(''), true);
  assert.equal(await optional.validator('MECHANICAL'), false);
});

test('plugin: forces validators on update queries (bug fix)', () => {
  const { hooks } = applyPlugin();
  assert.equal(hooks.length, 1);
  assert.ok(hooks[0].events.includes('findOneAndUpdate'));
  let options;
  hooks[0].fn.call({ setOptions: (o) => (options = o) });
  assert.deepEqual(options, { runValidators: true });
});

// ---------------------------------------------------------------------------
// middleware/errorHandler.js
// ---------------------------------------------------------------------------
function runErrorHandler(err, env = 'development') {
  const { errorHandler } = loadFresh('middleware/errorHandler');
  const previous = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  process.env.NODE_ENV = env;
  console.error = () => {}; // keep test output clean for expected 500s
  const res = fakeRes();
  try {
    errorHandler(err, {}, res, () => {});
  } finally {
    process.env.NODE_ENV = previous;
    console.error = originalConsoleError;
  }
  return res;
}

test('errorHandler: maps each kind of error to the right status', () => {
  const ApiError = require('../utils/ApiError');
  const named = (name, extra = {}) => Object.assign(new Error('x'), { name }, extra);

  let res = runErrorHandler(new ApiError(404, 'Notice not found'));
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Notice not found' });

  res = runErrorHandler(new ApiError(400, 'Validation failed', [{ field: 'title', message: 'required' }]));
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.errors, [{ field: 'title', message: 'required' }]);

  res = runErrorHandler(named('ValidationError', { errors: { title: { path: 'title', message: 'Path `title` is required.' } } }));
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.errors, [{ field: 'title', message: 'Path `title` is required.' }]);

  res = runErrorHandler(named('CastError', { path: '_id', value: 'abc' }));
  assert.equal(res.statusCode, 400);

  res = runErrorHandler(named('MongoServerError', { code: 11000, keyValue: { code: 'CSE' } }));
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /code=CSE/);

  res = runErrorHandler(named('JsonWebTokenError'));
  assert.equal(res.statusCode, 401);
  res = runErrorHandler(named('TokenExpiredError'));
  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /expired/i);

  res = runErrorHandler(Object.assign(new Error('bad json'), { type: 'entity.parse.failed' }));
  assert.equal(res.statusCode, 400);

  res = runErrorHandler(new Error('Operation `departments.find()` buffering timed out after 10000ms'));
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.message, 'Database is not connected');
});

test('errorHandler: unexpected errors — details in dev, hidden in production', () => {
  let res = runErrorHandler(new Error('secret db detail'), 'development');
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, 'secret db detail');
  assert.ok(res.body.stack);

  res = runErrorHandler(new Error('secret db detail'), 'production');
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, 'Internal server error');
  assert.equal(res.body.stack, undefined);

  res = runErrorHandler(Object.assign(new Error('Mongo path and internal data'), { name: 'CastError', path: 'student.email', value: 'private@example.test' }), 'production');
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { success: false, message: 'Invalid request' });

  res = runErrorHandler(Object.assign(new Error('duplicate private@example.test'), { code: 11000, keyValue: { email: 'private@example.test' } }), 'production');
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { success: false, message: 'A record with that value already exists.' });
});

test('errorHandler: notFound produces a 404 ApiError', () => {
  const { notFound } = loadFresh('middleware/errorHandler');
  let passed;
  notFound({ method: 'GET', originalUrl: '/nope' }, {}, (err) => (passed = err));
  assert.equal(passed.statusCode, 404);
  assert.equal(passed.message, 'Route not found');
});

test('asyncHandler: forwards a rejected promise to next()', async () => {
  const asyncHandler = loadFresh('utils/asyncHandler');
  const boom = new Error('boom');
  let received;
  await asyncHandler(async () => {
    throw boom;
  })({}, {}, (err) => (received = err));
  assert.equal(received, boom);
});

// ---------------------------------------------------------------------------
// middleware/auth.js
// ---------------------------------------------------------------------------
function loadAuth(users) {
  const namedError = (name, message) => Object.assign(new Error(message), { name });
  return loadFresh('middleware/auth', {
    bare: {
      jsonwebtoken: {
        verify(token) {
          if (token === 'good-student') return { id: 'student1' };
          if (token === 'good-admin') return { id: 'admin1' };
          if (token === 'good-disabled') return { id: 'disabled1' };
          if (token === 'good-deleted') return { id: 'ghost' };
          if (token === 'expired') throw namedError('TokenExpiredError', 'jwt expired');
          throw namedError('JsonWebTokenError', 'invalid token');
        },
      },
    },
    paths: { 'models/User': { findById: (id) => ({ select: async () => users[id] || null }) } },
  });
}

const demoUsers = {
  student1: { _id: 's1', role: 'student', active: true },
  admin1: { _id: 'a1', role: 'admin', active: true },
  disabled1: { _id: 'd1', role: 'student', active: false },
};

test('user accounts support all roles and optional department association', () => {
  const User = require('../models/User');
  assert.deepEqual(User.schema.path('role').enumValues, ['student', 'teacher', 'admin']);
  assert.equal(User.schema.path('department').isRequired, false);
});

test('auth.login issues JWTs for both student and admin accounts', async () => {
  let role = 'student';
  const signedPayloads = [];
  const user = {
    _id: { toString: () => `id-${role}` },
    email: 'user@example.test',
    role,
    active: true,
    isEmailVerified: true,
    tokenVersion: 2,
    async comparePassword(password) { return password === 'Password123!'; },
  };
  const controller = loadFresh('controllers/authController', {
    paths: {
      'models/User': {
        findOne: (filter) => {
          assert.deepEqual(filter, { email: 'user@example.test' });
          return { select: async () => { user.role = role; return user; } };
        },
      },
      'utils/jwt': { signToken: (payload) => { signedPayloads.push(payload); return `token-${role}`; } },
      'services/departmentService': { isValidDepartment: async () => true },
      'utils/otp': { generateOTP: () => '123456', hashOTP: () => 'hash', verifyOTP: () => false },
      'services/emailService': { sendVerificationEmail: async () => {}, sendPasswordResetEmail: async () => {} },
    },
  });

  for (role of ['student', 'admin']) {
    const res = fakeRes();
    let receivedError;
    await controller.login(
      { body: { email: ' USER@Example.test ', password: 'Password123!' } },
      res,
      (error) => { receivedError = error; }
    );
    assert.equal(receivedError, undefined);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.token, `token-${role}`);
    assert.equal(signedPayloads.at(-1).role, role);
  }
});

test('student registration accepts active departments added in the database', async () => {
  let createdUser;
  let sentEmail;
  const user = {
    email: 'student@example.test',
    name: 'Test Student',
    toJSON() { return this; },
  };
  const controller = loadFresh('controllers/authController', {
    paths: {
      'models/User': {
        findOne: async () => null,
        create: async (fields) => { createdUser = fields; return user; },
      },
      'services/departmentService': {
        isValidDepartment: async (code) => ['CSE', 'ELECTRONICS', 'ALL', 'ME'].includes(code),
      },
      'utils/jwt': { signToken: () => 'unused' },
      'utils/otp': { generateOTP: () => '123456', hashOTP: (otp) => `hashed:${otp}`, verifyOTP: () => false },
      'services/emailService': {
        sendVerificationEmail: async (payload) => { sentEmail = payload; },
        sendPasswordResetEmail: async () => {},
      },
    },
  });
  const res = fakeRes();
  let receivedError;

  await controller.register({ body: {
    name: 'Test Student',
    email: 'student@example.test',
    password: 'Password123!',
    rollNumber: 'R-1',
    department: 'me',
    semester: 1,
  } }, res, (error) => { receivedError = error; });

  assert.equal(receivedError, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(createdUser.department, 'ME');
  assert.equal(createdUser.role, 'student');
  assert.equal(sentEmail.otp, '123456');
});

// Runs middleware and resolves with whatever next() was called with.
const runMiddleware = (mw, req) => new Promise((resolve) => mw(req, fakeRes(), (err) => resolve(err)));

test('auth.protect: rejects missing / malformed / bad tokens', async () => {
  const { protect } = loadAuth(demoUsers);
  for (const authorization of [undefined, '', 'good-student', 'Basic abc', 'Bearer']) {
    const err = await runMiddleware(protect, { headers: { authorization } });
    assert.equal(err.statusCode, 401, `header: ${authorization}`);
  }
  const bad = await runMiddleware(protect, { headers: { authorization: 'Bearer nonsense' } });
  assert.equal(bad.name, 'JsonWebTokenError'); // errorHandler turns this into 401
  const expired = await runMiddleware(protect, { headers: { authorization: 'Bearer expired' } });
  assert.equal(expired.name, 'TokenExpiredError');
});

test('auth.protect: accepts a valid token, refuses disabled or deleted accounts', async () => {
  const { protect } = loadAuth(demoUsers);

  const req = { headers: { authorization: 'Bearer good-student' } };
  assert.equal(await runMiddleware(protect, req), undefined); // next() with no error
  assert.equal(req.user.role, 'student');

  const lower = { headers: { authorization: 'bearer good-admin' } }; // scheme is case-insensitive
  assert.equal(await runMiddleware(protect, lower), undefined);

  const disabled = await runMiddleware(protect, { headers: { authorization: 'Bearer good-disabled' } });
  assert.equal(disabled.statusCode, 401);
  const deleted = await runMiddleware(protect, { headers: { authorization: 'Bearer good-deleted' } });
  assert.equal(deleted.statusCode, 401);
});

test('auth.authorize: role-based access', async () => {
  const { authorize } = loadAuth(demoUsers);
  const adminOnly = authorize('admin');
  assert.equal(await runMiddleware(adminOnly, { user: { role: 'admin' } }), undefined);
  assert.equal((await runMiddleware(adminOnly, { user: { role: 'student' } })).statusCode, 403);
  assert.equal((await runMiddleware(adminOnly, { user: { role: 'teacher' } })).statusCode, 403);
  assert.equal((await runMiddleware(adminOnly, {})).statusCode, 401); // not logged in at all
  assert.deepEqual(authorize('admin', 'student').allowedRoles, ['admin', 'student']);
});

// ---------------------------------------------------------------------------
// services/noticeService.js — who sees what
// ---------------------------------------------------------------------------
function loadNoticeService() {
  return loadFresh('services/noticeService', {
    paths: { 'models/Department': fakeDepartmentModel(seeded) },
  });
}
const NOW = new Date('2026-01-15T10:00:00Z');
const ACTIVE = {
  $and: [
    { $or: [{ publishedAt: null }, { publishedAt: { $lte: NOW } }] },
    { $or: [{ expiresAt: null }, { expiresAt: { $gt: NOW } }] },
  ],
};

test('noticeService: students see own department + ALL, active only', () => {
  const { buildNoticeFilter } = loadNoticeService();
  const student = { role: 'student', department: 'CSE' };

  assert.deepEqual(buildNoticeFilter(student, {}, NOW), {
    $and: [
      { department: { $in: ['CSE', 'ALL'] } },
      { semester: { $in: [null, 'ALL'] } },
      ACTIVE,
    ],
  });
  // choosing another department in the UI works
  assert.deepEqual(buildNoticeFilter(student, { department: 'electronics' }, NOW).$and[0], {
    department: { $in: ['ELECTRONICS', 'ALL'] },
  });
  // a student with no department gets college-wide only
  assert.deepEqual(buildNoticeFilter({ role: 'student' }, {}, NOW).$and[0], { department: 'ALL' });
  // a student can NOT ask for expired notices
  const sneaky = buildNoticeFilter(student, { status: 'expired' }, NOW);
  assert.deepEqual(sneaky.$and[2], ACTIVE);
});

test('noticeService: anonymous visitors see current public notices and can filter departments', () => {
  const { buildNoticeFilter } = loadNoticeService();
  assert.deepEqual(buildNoticeFilter(null, {}, NOW), {
    $and: [ACTIVE],
  });
  assert.deepEqual(buildNoticeFilter(undefined, { department: 'cse', status: 'expired' }, NOW), {
    $and: [
      { department: { $in: ['CSE', 'ALL'] } },
      ACTIVE,
    ],
  });
});

test('noticeService: future publish dates stay hidden from public and students', () => {
  const { activeFilter } = loadNoticeService();
  assert.deepEqual(activeFilter(NOW).$and[0], {
    $or: [{ publishedAt: null }, { publishedAt: { $lte: NOW } }],
  });
});

test('noticeService: admins see everything unless they filter', () => {
  const { buildNoticeFilter } = loadNoticeService();
  const admin = { role: 'admin' };

  assert.deepEqual(buildNoticeFilter(admin, {}, NOW), {}); // nothing hidden
  assert.deepEqual(buildNoticeFilter(admin, { department: 'cse' }, NOW), { $and: [{ department: 'CSE' }] }); // exact, no ALL added
  assert.deepEqual(buildNoticeFilter(admin, { status: 'expired' }, NOW), {
    $and: [{ expiresAt: { $lte: NOW } }],
  });
  assert.deepEqual(buildNoticeFilter(admin, { status: 'active', category: 'Exam' }, NOW), {
    $and: [{ category: 'exam' }, ACTIVE],
  });
});

test('noticeService: search text is escaped, junk query values are ignored', () => {
  const { buildNoticeFilter } = loadNoticeService();
  const admin = { role: 'admin' };

  const filter = buildNoticeFilter(admin, { search: 'fee (2026).*' }, NOW);
  const rx = filter.$and[0].$or[0].title;
  assert.ok(rx instanceof RegExp);
  assert.equal(rx.test('Exam fee (2026).* notice'), true);
  assert.equal(rx.test('fee 2026 anything'), false); // "." and "*" are NOT wildcards
  assert.equal(rx.flags, 'i');

  // arrays / objects in the query string are ignored, never passed to Mongo
  assert.deepEqual(buildNoticeFilter(admin, { department: ['CSE', 'ALL'], search: { $ne: '' }, category: { $gt: '' } }, NOW), {});
});

test('SECURITY: notice ID lookup applies the same visibility filter as list', async () => {
  let receivedFilter;
  const visibleFilter = { department: { $in: ['CSE', 'ALL'] }, expiresAt: { $gt: new Date('2030-01-01') } };
  const controller = loadFresh('controllers/noticeController', {
    paths: {
      'models/Notice': { findOne(filter) { receivedFilter = filter; return { populate: async () => null }; } },
      'models/User': {},
      'services/noticeService': { buildNoticeFilter: () => visibleFilter },
    },
  });
  let receivedError;
  await controller.getOne(
    { params: { id: 'notice-id' }, query: {}, user: { _id: 'student-id', role: 'student', department: 'CSE' } },
    fakeRes(),
    (error) => { receivedError = error; }
  );
  assert.equal(receivedError.statusCode, 404);
  assert.deepEqual(receivedFilter, { $and: [{ _id: 'notice-id' }, visibleFilter] });
});

test('SECURITY: conversation reads require owner id and exclude internal fields', async () => {
  let receivedFilter;
  let messageQuery;
  const controller = loadFresh('controllers/conversationController', {
    paths: {
      'models/Conversation': {
        findOne(filter) {
          receivedFilter = filter;
          return { select: async () => ({ _id: 'owned-conversation', title: 'Owned', department: 'CSE' }) };
        },
      },
      'models/Message': {
        find(filter) {
          messageQuery = filter;
          return { select: () => ({ sort: async () => [{ _id: 'message-id', role: 'user', content: 'hello' }] }) };
        },
      },
    },
  });
  const res = fakeRes();
  let receivedError;
  await controller.getConversation(
    { params: { id: 'owned-conversation' }, user: { _id: 'student-a' } },
    res,
    (error) => { receivedError = error; }
  );
  assert.equal(receivedError, undefined);
  assert.deepEqual(receivedFilter, { _id: 'owned-conversation', user: 'student-a' });
  assert.deepEqual(messageQuery, { conversation: 'owned-conversation' });
  assert.equal(res.body.data.conversation.user, undefined);
});

test('SECURITY: verified email cannot obtain a token through OTP verification', async () => {
  let tokenIssueCount = 0;
  const controller = loadFresh('controllers/authController', {
    paths: {
      'models/User': {
        findOne: () => ({ select: async () => ({ isEmailVerified: true }) }),
      },
      'utils/jwt': { signToken: () => { tokenIssueCount += 1; return 'should-not-exist'; } },
      'utils/otp': { generateOTP: () => '123456', hashOTP: () => 'hash', verifyOTP: () => true },
      'services/emailService': { sendVerificationEmail: async () => {}, sendPasswordResetEmail: async () => {} },
    },
  });
  const res = fakeRes();
  let receivedError;
  await controller.verifyEmail(
    { body: { email: 'verified@example.test', otp: '123456' } },
    res,
    (error) => { receivedError = error; }
  );
  assert.equal(receivedError, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.alreadyVerified, true);
  assert.equal(tokenIssueCount, 0);
  assert.equal(res.body.data, undefined);
});

test('forgot password: unknown email returns 404 without generating, saving, or sending an OTP', async () => {
  let otpSideEffects = 0;
  let receivedFilter;
  const controller = loadFresh('controllers/authController', {
    paths: {
      'models/User': { findOne: async (filter) => { receivedFilter = filter; return null; } },
      'utils/jwt': { signToken: () => 'unused' },
      'utils/otp': {
        generateOTP: () => { otpSideEffects += 1; return '123456'; },
        hashOTP: () => { otpSideEffects += 1; return 'hash'; },
        verifyOTP: () => false,
      },
      'services/emailService': {
        sendVerificationEmail: async () => {},
        sendPasswordResetEmail: async () => { otpSideEffects += 1; },
      },
    },
  });

  let forwardedError;
  const res = fakeRes();
  await controller.forgotPassword(
    { body: { email: '  Test123456@Example.com  ' } },
    res,
    (error) => { forwardedError = error; }
  );

  assert.deepEqual(receivedFilter, { email: 'test123456@example.com' });
  assert.equal(forwardedError.statusCode, 404);
  assert.equal(forwardedError.message, 'No account found with this email. Please register first.');
  assert.equal(otpSideEffects, 0);
  assert.equal(res.statusCode, null);
  assert.equal(res.body, null);
});

test('forgot password: existing student/admin email is normalized and OTP is saved before email send', async () => {
  let receivedFilter;
  let savedBeforeSend = false;
  let emailPayload;
  const user = {
    email: 'registered@email.com',
    name: 'Registered User',
    role: 'admin',
    resetOtpLastSentAt: null,
    async save() { savedBeforeSend = true; },
  };
  const controller = loadFresh('controllers/authController', {
    paths: {
      'models/User': { findOne: async (filter) => { receivedFilter = filter; return user; } },
      'utils/jwt': { signToken: () => 'unused' },
      'utils/otp': {
        generateOTP: () => '654321',
        hashOTP: (otp) => `hashed:${otp}`,
        verifyOTP: () => false,
      },
      'services/emailService': {
        sendVerificationEmail: async () => {},
        sendPasswordResetEmail: async (payload) => {
          assert.equal(savedBeforeSend, true);
          emailPayload = payload;
        },
      },
    },
  });

  const res = fakeRes();
  await controller.forgotPassword({ body: { email: '  REGISTERED@EMAIL.COM  ' } }, res, (error) => { throw error; });

  assert.deepEqual(receivedFilter, { email: 'registered@email.com' });
  assert.equal(user.resetOtpHash, 'hashed:654321');
  assert.equal(user.resetOtpAttempts, 0);
  assert.ok(user.resetOtpExpiresAt.getTime() - Date.now() <= 10 * 60 * 1000);
  assert.equal(emailPayload.email, user.email);
  assert.equal(emailPayload.otp, '654321');
  assert.equal(res.statusCode, 200);
});

// ---------------------------------------------------------------------------
// ROUTE SECURITY AUDIT — every write route must require login + admin
// ---------------------------------------------------------------------------
function makeFakeExpress() {
  const express = () => {};
  express.Router = () => {
    const router = { routes: [], uses: [] };
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      router[method] = (routePath, ...handlers) => {
        router.routes.push({ method: method.toUpperCase(), path: routePath, handlers: handlers.flat(), uses: [...router.uses] });
        return router;
      };
    }
    router.use = (...handlers) => {
      router.uses.push(...handlers.flat());
      return router;
    };
    return router;
  };
  return express;
}

// Any property you read from this module is a distinct named function.
function fakeNamedModule(label) {
  const cache = {};
  return new Proxy({}, {
    get(_, prop) {
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      return (cache[prop] ??= Object.assign(function () {}, { label: `${label}.${prop}` }));
    },
  });
}

function loadRoutes(file) {
  const router = loadFresh(`routes/${file}`, {
    bare: {
      express: makeFakeExpress(),
      'express-validator': { validationResult: () => ({ isEmpty: () => true }) },
      jsonwebtoken: { verify() {} },
    },
    paths: {
      'models/User': {},
      'controllers/departmentController': fakeNamedModule('departmentController'),
      'controllers/noticeController': fakeNamedModule('noticeController'),
      'middleware/validators/department.validators': fakeNamedModule('deptRules'),
      'middleware/validators/notice.validators': fakeNamedModule('noticeRules'),
    },
  });
  const auth = require(path.join(SERVER, 'middleware/auth'));
  return { router, auth };
}

const effective = (route) => [...route.uses, ...route.handlers];
const isAdminOnly = (route, authorize) =>
  effective(route).some((h) => Array.isArray(h.allowedRoles) && h.allowedRoles.includes('admin') && !h.allowedRoles.includes('student'));

test('SECURITY AUDIT: department routes', () => {
  const { router, auth } = loadRoutes('department.routes');
  assert.ok(router.routes.length >= 4);

  for (const route of router.routes) {
    const name = `${route.method} ${route.path}`;
    if (route.method === 'GET' && route.path === '/') {
      assert.equal(effective(route).includes(auth.protect), false, `${name} is intentionally public`);
      continue;
    }
    assert.ok(effective(route).includes(auth.protect), `${name} must require login`);
    assert.ok(isAdminOnly(route), `${name} must be admin-only`);
  }
  // '/all' must be declared before '/:id' style routes
  const paths = router.routes.map((r) => r.path);
  assert.ok(paths.indexOf('/all') < paths.indexOf('/:id'));
});

test('SECURITY AUDIT: notice routes', () => {
  const { router, auth } = loadRoutes('notice.routes');
  assert.ok(router.routes.length >= 6);

  for (const route of router.routes) {
    const name = `${route.method} ${route.path}`;
    if (route.method === 'GET') {
      assert.equal(effective(route).includes(auth.protect), false, `${name} is public for crawlable notices`);
      assert.equal(isAdminOnly(route), false, `${name} must be readable by students`);
    } else {
      assert.ok(effective(route).includes(auth.protect), `${name} must require login`);
      assert.ok(isAdminOnly(route), `${name} must be admin-only`);
    }
  }
  // '/categories' must be declared before '/:id' or it would be treated as an id
  const getPaths = router.routes.filter((r) => r.method === 'GET').map((r) => r.path);
  assert.ok(getPaths.indexOf('/categories') < getPaths.indexOf('/:id'));
});

test('SECURITY AUDIT: routes run validation before the controller', () => {
  const { router } = loadRoutes('notice.routes');
  const validate = require(path.join(SERVER, 'middleware/validate'));
  for (const route of router.routes) {
    if (route.path === '/categories') continue; // takes no input
    const list = route.handlers;
    const validateAt = list.indexOf(validate);
    const controllerAt = list.findIndex((h) => String(h.label).startsWith('noticeController.'));
    assert.ok(validateAt !== -1, `${route.method} ${route.path} must run validate`);
    assert.ok(validateAt < controllerAt, `${route.method} ${route.path}: validate must run before the controller`);
  }
});
