require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const routes = require('./routes/index');
const errorMiddleware = require('./middleware/errorMiddleware');
const db = require('./db');

// ─── JWT Secret Guard (BUG-017) ───────────────────────────────────────────────
// Refuse to start with the committed placeholder or any weak (<32 char) secret.
const JWT_SECRET = process.env.JWT_SECRET || '';
const KNOWN_WEAK_SECRETS = ['crm-jwt-secret-key-phase1-2024'];
if (
  KNOWN_WEAK_SECRETS.includes(JWT_SECRET) ||
  JWT_SECRET.length < 32
) {
  console.error(
    '[FATAL] JWT_SECRET is missing or too weak. Set a high-entropy secret (≥32 chars) in .env before starting the server.'
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded files to frontend
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Static Files (uploads) ───────────────────────────────────────────────────
// SECURITY (BUG-002): Only public, low-sensitivity assets (company logos) are
// served statically. Sensitive booking documents (ID proofs, signed agreements,
// payment proofs) are NOT exposed here — they are downloaded through the
// authenticated, tenant-scoped route GET /api/bookings/:id/documents/:documentId/download.
app.use('/uploads/companies', express.static(path.join(__dirname, '..', 'uploads', 'companies')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Health Check ─────────────────────────────────────────────────────────────
// BUG-031: verify DB connectivity so load-balancers can detect a down database.
app.get('/health', async (req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Server is running', data: { timestamp: new Date(), db: 'ok' } });
  } catch {
    res.status(503).json({ success: false, message: 'Database unreachable', data: { timestamp: new Date(), db: 'error' } });
  }
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', data: null });
});

// ─── Centralized Error Handler (registered last) ─────────────────────────────
app.use(errorMiddleware);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
