// seed/seedDepartments.js
//
// Run once:  npm run seed      (or: node seed/seedDepartments.js)
// Safe to re-run — uses upsert so it won't duplicate.
//
// Re-running NEVER overwrites a name or active flag an admin has changed;
// it only creates missing departments and adds any missing seed aliases.

require('../utils/loadEnv'); // STEP 2 fix: the original never loaded .env

const mongoose = require('mongoose');
const Department = require('../models/Department');
const { INITIAL_DEPARTMENTS } = require('./departmentData');

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  if (!MONGO_URI) throw new Error('MONGO_URI must be configured before seeding departments.');
  await mongoose.connect(MONGO_URI);

  try {
    for (const dept of INITIAL_DEPARTMENTS) {
      await Department.findOneAndUpdate(
        { code: dept.code },
        {
          $setOnInsert: { name: dept.name, isAll: dept.isAll, active: true },
          $addToSet: { aliases: { $each: dept.aliases } },
        },
        { upsert: true, new: true }
      );
      console.log(`Seeded department: ${dept.code}`);
    }

    console.log('Done. To add a new department later, POST /api/departments as an admin');
    console.log('(e.g. { code: "MECHANICAL", name: "Mechanical Engineering", aliases: ["mech"] })');
    console.log('— no code changes needed elsewhere.');
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Department seed failed', { name: err?.name || 'Error', code: err?.code || 'unknown' });
    process.exit(1);
  });
}

module.exports = { seed };
