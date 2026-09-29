// app.js
//
// Builds the Express app (middleware + routes + error handling) WITHOUT
// starting the server. server.js starts it. Keeping them apart makes the
// app easy to test.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const ApiError = require('./utils/ApiError');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth.routes');
const facultyRoutes = require('./routes/faculty.routes');
const timetableRoutes = require('./routes/timetable.routes');
const syllabusRoutes = require('./routes/syllabus.routes');
const documentRoutes = require('./routes/document.routes');
const faqRoutes = require('./routes/faq.routes');
const knowledgeRoutes = require('./routes/knowledge.routes');
const chatRoutes = require('./routes/chat.routes');
const conversationRoutes = require('./routes/conversation.routes');
const profileRoutes = require('./routes/profile.routes');
const adminRoutes = require('./routes/admin.routes');
const practicalRoutes = require('./routes/practical.routes');
const assignmentRoutes = require('./routes/assignment.routes');

const app = express();

// Trust only the configured number of reverse-proxy hops. Render terminates
// HTTPS at its load balancer and forwards client IP/protocol headers.
const trustedProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '0', 10);
if (Number.isInteger(trustedProxyHops) && trustedProxyHops > 0) {
  app.set('trust proxy', trustedProxyHops);
}

// ---- Security & parsing ---------------------------------------------------

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = curl/Postman/server-to-server
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(
        new ApiError(403, `Origin ${origin} is not allowed by CORS`)
      );
    },
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan(':method :status :response-time ms')
  );
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use('/api', (req, res, next) => {
  if (req.body === undefined) req.body = {};
  if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return next(new ApiError(400, 'Request body must be a JSON object.'));
  }
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key.length > 64 || key.startsWith('$') || key.includes('.') || typeof value !== 'string' || value.length > 2048) {
      return next(new ApiError(400, 'Query parameters must use short, scalar values.'));
    }
  }
  next();
});

// ---- Routes ---------------------------------------------------------------

app.get('/', (req, res) => {
  res.json({
    message: 'College AI Assistant API is running 🚀',
  });
});

// Frontend connectivity check. Keep the root health endpoint available for
// curl and direct API checks while allowing the client to use its /api base URL.
app.get('/api/health', (req, res) => {
  res.json({
    message: 'College AI Assistant API is running 🚀',
  });
});

// Used by the hosting platform as a readiness probe. Liveness stays available
// at / and /api/health while MongoDB reconnects; this endpoint only reports
// ready once the database connection is established.
app.get('/readyz', (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ ready: false, database: 'disconnected' });
  }
  return res.json({ ready: true });
});

app.use(
  '/api/departments',
  require('./routes/department.routes')
);

app.use(
  '/api/notices',
  require('./routes/notice.routes')
);

// Authentication
app.use('/api/auth', authRoutes);

// Profile
app.use('/api/profile', profileRoutes);

// Faculty
app.use('/api/faculty', facultyRoutes);

// Timetable
app.use('/api/timetable', timetableRoutes);

// Syllabus
app.use('/api/syllabus', syllabusRoutes);

// Documents
app.use('/api/documents', documentRoutes);

// FAQs
app.use('/api/faqs', faqRoutes);
app.use('/api/faq', faqRoutes);

// Knowledge Base
app.use('/api/knowledge', knowledgeRoutes);

// Chat
app.use('/api/chat', chatRoutes);

// Conversations / Chat History
app.use('/api/conversations', conversationRoutes);

// Notifications
app.use('/api/notifications', require('./routes/notification.routes'));

// Practicals
app.use('/api/practicals', practicalRoutes);

// Assignments
app.use('/api/assignments', assignmentRoutes);

// Admin
app.use('/api/admin', adminRoutes);

// ---- Errors (must be LAST) ------------------------------------------------

app.use(notFound);
app.use(errorHandler);

module.exports = app;
