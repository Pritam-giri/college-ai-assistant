// Seed clearly labeled development-only records for chatbot demonstrations.
// This script refuses to run in production and requires explicit opt-in.

require('../utils/loadEnv');

const mongoose = require('mongoose');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Timetable = require('../models/Timetable');
const Notice = require('../models/Notice');
const FAQ = require('../models/FAQ');
const KnowledgeBase = require('../models/KnowledgeBase');

const SAMPLE = 'SAMPLE / DEVELOPMENT DATA';

async function upsertSample(Model, filter, data) {
  await Model.updateOne(filter, { $setOnInsert: data }, { upsert: true, runValidators: true });
}

async function seedSampleCollegeData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Sample college data cannot be seeded when NODE_ENV=production.');
  }
  if (process.env.ALLOW_SAMPLE_DATA !== 'true') {
    throw new Error('Set ALLOW_SAMPLE_DATA=true in the local environment to explicitly enable development sample data.');
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured before seeding sample data.');

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const requiredDepartments = ['CSE', 'ELECTRONICS', 'ALL'];
    const departments = await Department.find({ code: { $in: requiredDepartments }, active: true }).select('code');
    const available = new Set(departments.map((department) => department.code));
    const missing = requiredDepartments.filter((code) => !available.has(code));
    if (missing.length) {
      throw new Error(`Seed departments first (npm run seed --prefix server). Missing: ${missing.join(', ')}.`);
    }

    const facultyRows = [
      { name: `${SAMPLE} CSE Faculty A`, department: 'CSE', designation: `${SAMPLE} Head of Department`, qualification: 'Sample qualification', office: `${SAMPLE} CSE office`, isHOD: true },
      { name: `${SAMPLE} CSE Faculty B`, department: 'CSE', designation: `${SAMPLE} Assistant Professor`, qualification: 'Sample qualification', office: `${SAMPLE} CSE office 2`, isHOD: false },
      { name: `${SAMPLE} Electronics Faculty A`, department: 'ELECTRONICS', designation: `${SAMPLE} Head of Department`, qualification: 'Sample qualification', office: `${SAMPLE} Electronics office`, isHOD: true },
      { name: `${SAMPLE} Electronics Faculty B`, department: 'ELECTRONICS', designation: `${SAMPLE} Assistant Professor`, qualification: 'Sample qualification', office: `${SAMPLE} Electronics office 2`, isHOD: false },
    ];
    const facultyByName = new Map();
    for (const faculty of facultyRows) {
      const saved = await Faculty.findOneAndUpdate(
        { name: faculty.name, department: faculty.department },
        { $setOnInsert: faculty },
        { upsert: true, new: true, runValidators: true }
      );
      facultyByName.set(faculty.name, saved._id);
    }

    const timetableRows = [
      {
        department: 'CSE', semester: 3, day: 'MON',
        slots: [
          { time: '09:00-10:00', subject: `${SAMPLE}: Data Structures`, faculty: facultyByName.get(`${SAMPLE} CSE Faculty A`), room: `${SAMPLE} Room C-101` },
          { time: '10:15-11:15', subject: `${SAMPLE}: Database Systems`, faculty: facultyByName.get(`${SAMPLE} CSE Faculty B`), room: `${SAMPLE} Room C-102` },
        ],
      },
      {
        department: 'ELECTRONICS', semester: 3, day: 'TUE',
        slots: [
          { time: '09:00-10:00', subject: `${SAMPLE}: Electronic Devices`, faculty: facultyByName.get(`${SAMPLE} Electronics Faculty A`), room: `${SAMPLE} Room E-201` },
          { time: '10:15-11:15', subject: `${SAMPLE}: Digital Electronics`, faculty: facultyByName.get(`${SAMPLE} Electronics Faculty B`), room: `${SAMPLE} Room E-202` },
        ],
      },
    ];
    for (const row of timetableRows) {
      await Timetable.updateOne(
        { department: row.department, semester: row.semester, day: row.day },
        { $setOnInsert: row },
        { upsert: true, runValidators: true }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const notices = [
      { department: 'CSE', title: `${SAMPLE} CSE Academic Notice`, body: 'Development-only example notice. This is not a real college announcement or deadline.', category: 'academic', publishedAt: now, expiresAt },
      { department: 'ELECTRONICS', title: `${SAMPLE} Electronics Academic Notice`, body: 'Development-only example notice. This is not a real college announcement or deadline.', category: 'academic', publishedAt: now, expiresAt },
      { department: 'ALL', title: `${SAMPLE} College-wide Notice`, body: 'Development-only example notice for demonstrating college-wide retrieval. This is not a real college announcement.', category: 'general', publishedAt: now, expiresAt },
    ];
    for (const notice of notices) {
      await upsertSample(Notice, { department: notice.department, title: notice.title }, notice);
    }

    const faq = {
      department: 'ALL',
      question: `${SAMPLE}: What are the example library hours?`,
      answer: 'This is demonstration content only. The real library hours have not been verified; contact the college administration.',
      tags: ['sample', 'development', 'library'],
    };
    await upsertSample(FAQ, { department: faq.department, question: faq.question }, faq);

    const knowledge = {
      department: 'ALL',
      title: `${SAMPLE} College Information Example`,
      content: 'This knowledge-base entry exists only to demonstrate retrieval. It does not describe a verified Government Polytechnic Unnao rule or policy.',
      keywords: ['sample', 'development', 'college information'],
    };
    await upsertSample(KnowledgeBase, { department: knowledge.department, title: knowledge.title }, knowledge);

    console.log('Development sample data added. Every seeded name, subject, notice, and answer is labeled as sample data.');
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedSampleCollegeData().catch((error) => {
    console.error('Sample data seed failed:', { message: error.message, name: error?.name || 'Error' });
    process.exitCode = 1;
  });
}

module.exports = { seedSampleCollegeData };
