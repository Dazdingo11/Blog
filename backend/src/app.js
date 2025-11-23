const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { corsOrigin } = require('./config/env');

const authRoutes = require('./modules/auth/routes');
const protectedRoutes = require('./modules/auth/protected');
const postRoutes = require('./modules/posts/routes');
const profileRoutes = require('./modules/profile/routes');
const likeRoutes = require('./modules/likes/routes');
const commentRoutes = require('./modules/comments/routes');
const messageRoutes = require('./modules/messages/routes');
const userRoutes = require('./modules/users/routes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Serve uploaded media from the same directory used by post/profile uploads.
// Ensure uploads directory exists (shared by posts/profile uploads).
// Modules write to backend/src/uploads (path resolved with ../../uploads from module dirs).
const uploadDirPrimary = path.join(__dirname, 'uploads'); // where multer writes (src/uploads)
const uploadDirSecondary = path.join(__dirname, '../uploads'); // fallback if uploads is moved up a level
for (const dir of [uploadDirPrimary, uploadDirSecondary]) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      // Best effort; if secondary can't be created we still serve primary.
    }
  }
}
app.use('/uploads', express.static(uploadDirPrimary));
app.use('/uploads', express.static(uploadDirSecondary));
// Alias under /api/uploads in case callers prefix with API base.
app.use('/api/uploads', express.static(uploadDirPrimary));
app.use('/api/uploads', express.static(uploadDirSecondary));

// Throttle auth to discourage brute force.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });

app.get('/api/health', (_req, res) => res.status(200).json({ ok: true }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/protected-example', protectedRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', likeRoutes);
app.use('/api', commentRoutes);
app.use('/api', messageRoutes);
app.use('/api', userRoutes);

app.use((_req, res) =>
  res.status(404).json({
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    error: { code: 'SERVER_ERROR', message: err.message },
  });
});

module.exports = app;
