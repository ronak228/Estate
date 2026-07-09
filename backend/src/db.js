require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// P1-10 fix: the adapter previously used pg's bare defaults (max 10 connections,
// no explicit timeouts). Fine for a single low-traffic instance, but every app
// instance opens its own pool — at more than one instance (or a spike in
// concurrent requests) this can exhaust Postgres's max_connections with no
// warning beyond opaque connection errors. These are opt-in via env vars so
// behavior is unchanged unless explicitly tuned for a given deployment; for
// multi-instance deployments, prefer fronting Postgres with PgBouncer over
// raising DB_POOL_MAX indefinitely.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.DB_POOL_MAX && { max: Number(process.env.DB_POOL_MAX) }),
  ...(process.env.DB_POOL_IDLE_TIMEOUT_MS && {
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS),
  }),
  ...(process.env.DB_POOL_CONNECTION_TIMEOUT_MS && {
    connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS),
  }),
});
const db = new PrismaClient({ adapter });

module.exports = db;
