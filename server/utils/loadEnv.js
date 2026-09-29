// utils/loadEnv.js
//
// Loads environment variables. Looks for the project-root .env first
// (college-ai-assistant/.env), then server/.env as a fallback.
// dotenv never overwrites a variable that is already set, so the first
// file found wins. Require this BEFORE anything reads process.env.

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
