const db = require('../db');
const { sendSuccess } = require('../utils/response');

// ─── GET /api/search?q= ───────────────────────────────────────────────────────
//
// Global, typo-tolerant search across the record types a sales user actually
// looks up day to day (contacts, inquiries, bookings, projects, units).
// Uses Postgres pg_trgm `similarity()` alongside a plain ILIKE substring
// match — trigram similarity alone is unreliable on short strings (a 4-char
// query rarely clears a useful threshold), so a query only needs to satisfy
// ONE of the two to appear, and results are ranked by whichever score is
// highest. This is what makes "Dharshan"/"Vistra"-style typos still surface
// the right record instead of only exact substrings.
const MIN_QUERY_LENGTH = 2;
const SIMILARITY_THRESHOLD = 0.2;
const LIMIT_PER_GROUP = 5;

const emptyResults = (query) => ({
  query,
  contacts: [],
  inquiries: [],
  bookings: [],
  projects: [],
  units: [],
});

const globalSearch = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const query = (req.query.q || '').trim();

    if (!companyId || query.length < MIN_QUERY_LENGTH) {
      return sendSuccess(res, 'Search results', emptyResults(query));
    }

    const like = `%${query}%`;

    const [contacts, inquiries, bookings, projects, units] = await Promise.all([
      db.$queryRaw`
        SELECT id, "fullName", phone, email,
               GREATEST(similarity("fullName", ${query}), similarity(phone, ${query})) AS score
        FROM "Contact"
        WHERE "companyId" = ${companyId}
          AND (
            "fullName" ILIKE ${like} OR phone ILIKE ${like} OR email ILIKE ${like}
            OR similarity("fullName", ${query}) > ${SIMILARITY_THRESHOLD}
          )
        ORDER BY score DESC NULLS LAST
        LIMIT ${LIMIT_PER_GROUP}
      `,
      db.$queryRaw`
        SELECT i.id, i.stage, c."fullName" AS "contactName",
               similarity(c."fullName", ${query}) AS score
        FROM "Inquiry" i
        JOIN "Contact" c ON c.id = i."contactId"
        WHERE i."companyId" = ${companyId}
          AND (c."fullName" ILIKE ${like} OR c.phone ILIKE ${like}
               OR similarity(c."fullName", ${query}) > ${SIMILARITY_THRESHOLD})
        ORDER BY score DESC NULLS LAST
        LIMIT ${LIMIT_PER_GROUP}
      `,
      db.$queryRaw`
        SELECT b.id, b.status, c."fullName" AS "contactName", u."unitNumber",
               GREATEST(similarity(c."fullName", ${query}), similarity(u."unitNumber", ${query})) AS score
        FROM "Booking" b
        JOIN "Inquiry" i ON i.id = b."inquiryId"
        JOIN "Contact" c ON c.id = i."contactId"
        JOIN "Unit" u ON u.id = b."unitId"
        WHERE i."companyId" = ${companyId}
          AND (c."fullName" ILIKE ${like} OR u."unitNumber" ILIKE ${like}
               OR similarity(c."fullName", ${query}) > ${SIMILARITY_THRESHOLD})
        ORDER BY score DESC NULLS LAST
        LIMIT ${LIMIT_PER_GROUP}
      `,
      db.$queryRaw`
        SELECT id, name, location, status, similarity(name, ${query}) AS score
        FROM "Project"
        WHERE "companyId" = ${companyId}
          AND (name ILIKE ${like} OR location ILIKE ${like} OR similarity(name, ${query}) > ${SIMILARITY_THRESHOLD})
        ORDER BY score DESC NULLS LAST
        LIMIT ${LIMIT_PER_GROUP}
      `,
      db.$queryRaw`
        SELECT u.id, u."unitNumber", u.status, u."projectId", p.name AS "projectName",
               similarity(u."unitNumber", ${query}) AS score
        FROM "Unit" u
        JOIN "Project" p ON p.id = u."projectId"
        WHERE p."companyId" = ${companyId}
          AND (u."unitNumber" ILIKE ${like} OR similarity(u."unitNumber", ${query}) > ${SIMILARITY_THRESHOLD})
        ORDER BY score DESC NULLS LAST
        LIMIT ${LIMIT_PER_GROUP}
      `,
    ]);

    return sendSuccess(res, 'Search results', {
      query,
      contacts,
      inquiries,
      bookings,
      projects,
      units,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { globalSearch };
