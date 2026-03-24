const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDb = require('./utils/db');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// So req.protocol / x-forwarded-proto are correct behind Render, Railway, etc.
app.set('trust proxy', 1);

const frontendOrigin = process.env.FRONTEND_ORIGIN;
app.use(
  cors({
    origin: frontendOrigin ? frontendOrigin.split(',').map((s) => s.trim()) : true,
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Database
connectDb();

// Routes
app.get('/', (req, res) => {
  res.status(200).send('API is running');
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/accountant', require('./routes/accountant'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/homework', require('./routes/homework'));
app.use('/api/public', require('./routes/public'));
app.use('/api/files', require('./routes/files'));

// Serve uploaded files (local fallback storage)
// Force inline viewing + correct MIME types so PDFs/DOCs/PPTs open in viewer instead of download.
const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    setHeaders: (res, filePath) => {
      // Force download but keep correct MIME types so OS can open properly.
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${path.basename(filePath || '')}"`
      );

      const ext = path.extname(filePath || '').toLowerCase();
      if (MIME_MAP[ext]) {
        res.setHeader('Content-Type', MIME_MAP[ext]);
      }
    },
  })
);

// Error handler (handles Mongoose validation, duplicate key, etc.)
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors || {}).map((e) => e.message).join(', ');
    return res.status(400).json({ message: msg || 'Validation failed' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value. This record may already exist.' });
  }
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

const PORT = Number(process.env.PORT || 5000);

function start(port, attempt = 0) {
  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  // Prevent unhandled crashes (EADDRINUSE stacks) and handle port conflicts cleanly
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const isRender = Boolean(process.env.RENDER_EXTERNAL_URL || process.env.RENDER);

      if (isRender) {
        console.error(
          `[server] Port ${port} is already in use. On Render this should never happen. ` +
            `Stop extra processes and redeploy.`
        );
        process.exit(1);
      }

      const next = port + 1;
      if (attempt < 5) {
        console.warn(`[server] Port ${port} is in use. Retrying on ${next}...`);
        return start(next, attempt + 1);
      }

      console.error(
        `[server] Port ${port} is in use and retries failed. Stop the other backend process and run again.`
      );
      process.exit(1);
    }

    // Other errors: keep default behavior but avoid silent failures
    console.error('[server] Failed to start:', err);
    process.exit(1);
  });

  return server;
}

start(PORT);

