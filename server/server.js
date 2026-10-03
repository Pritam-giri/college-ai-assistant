// server.js

require('./utils/loadEnv');

const mongoose = require('mongoose');
const app = require('./app');
const { validateEmailConfig } = require('./services/emailService');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('\n❌ JWT_SECRET is missing or shorter than 32 characters.');
  process.exit(1);
}

try {
  validateEmailConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

async function startServer() {
  const server = app.listen(PORT, () => {
    console.log(
      `✅ College AI Assistant API listening on http://localhost:${PORT}`
    );
  });

  let stopping = false;
  const connectDatabase = async () => {
    let retryDelayMs = 2000;

    while (!stopping) {
      try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
        await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 10000,
          maxPoolSize: 10,
          minPoolSize: 0,
        });
        console.log('✅ MongoDB connected');
        return;
      } catch (err) {
        console.error('MongoDB connection failed; retrying in the background.', {
          name: err?.name || 'Error',
          code: err?.code || 'unknown',
        });
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        retryDelayMs = Math.min(retryDelayMs * 2, 30000);
      }
    }
  };

  connectDatabase();

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection', { name: err?.name || 'Error' });
    server.close(() => process.exit(1));
  });

  const shutdown = (signal) => {
    stopping = true;
    console.log(`${signal} received; closing API and database connections.`);
    server.close(async () => {
      try {
        await mongoose.disconnect();
        process.exit(0);
      } catch (err) {
        console.error('Graceful shutdown failed', { name: err?.name || 'Error' });
        process.exit(1);
      }
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer();
