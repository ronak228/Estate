-- Enables fuzzy/typo-tolerant text matching (similarity(), % operator) used
-- by the global search endpoint (GET /api/search).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
