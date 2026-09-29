// seed/seedAdmin.js

require('../utils/loadEnv');

const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');

  if (!process.env.MONGO_URI || !email || !password) {
    throw new Error('MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD must be configured.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }
  if (
    Buffer.byteLength(password, 'utf8') < 16 ||
    Buffer.byteLength(password, 'utf8') > 72 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error('ADMIN_PASSWORD must contain 16 to 72 UTF-8 bytes, including uppercase, lowercase, number, and special characters.');
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      if (existingAdmin.role !== 'admin') {
        throw new Error('ADMIN_EMAIL already belongs to a non-admin account; no role change was made.');
      }
      console.log('Admin account already exists; no changes made.');
      return;
    }

    await User.create({
      name: 'College Admin',
      email,
      password,
      role: 'admin',
      isEmailVerified: true,
      active: true,
    });

    console.log('Admin account created successfully.');
  } catch (error) {
    console.error('Admin creation failed:', { name: error?.name || 'Error', code: error?.code || 'unknown' });
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
}

seedAdmin().catch((error) => {
  console.error('Admin creation failed:', { name: error?.name || 'Error', code: error?.code || 'unknown' });
  process.exitCode = 1;
});
