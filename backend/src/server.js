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

// ─── Trust Proxy (P1-08) ──────────────────────────────────────────────────────
// express-rate-limit (and req.ip generally) needs this to see the real client
// IP once the app sits behind a reverse proxy/load balancer. Without it, every
// request appears to come from the proxy's own address, collapsing the
// per-IP login rate limit into a single shared bucket for all users — or, if
// a proxy is trusted elsewhere without care, becomes spoofable via
// X-Forwarded-For. There is no safe universal default (the correct value
// depends on how many proxy hops sit in front of this process), so it is off
// (Express default: disabled) unless TRUST_PROXY is set. Set it to match your
// actual deployment topology, e.g. TRUST_PROXY=1 for exactly one reverse proxy
// (nginx/ALB) in front, or TRUST_PROXY=loopback for local-only proxies.
if (process.env.TRUST_PROXY) {
  const trustProxy = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
}

// ─── Security ─────────────────────────────────────────────────────────────────
// P2-20 fix (2026-07-08): the relaxed cross-origin-resource-policy was previously
// applied globally so every JSON API response could be embedded cross-origin,
// not just the static uploads it was meant for. helmet() now uses its safe
// default (same-origin); the relaxed policy is applied only on the
// /uploads/companies static route below, where it's actually needed.
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// P2-21 fix: support a comma-separated allowlist (CLIENT_URLS) so staging and
// production frontends — or multiple company-branded domains — can be trusted
// simultaneously. CLIENT_URL is kept as a single-origin fallback for existing
// deployments that only set that variable.
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no Origin header, e.g. curl/health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
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
app.use(
  '/uploads/companies',
  helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
  express.static(path.join(__dirname, '..', 'uploads', 'companies'))
);

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
