# FINAL PROJECT AUDIT REPORT
### Real Estate CRM — Full-Stack Audit
**Audit Type:** Senior Architecture / QA / Code Review
**Scope:** Backend, Frontend, Database, APIs, Security, Business Logic, Integrations
**Method:** Static source review of every module (no code executed, no code modified)
**Audit Date:** 2026-07-01

---

## 1. Executive Summary

The project is a multi-tenant Real Estate CRM built on **Node/Express + Prisma (PostgreSQL)** for the backend and **React (Vite) + Tailwind** for the frontend. It covers Authentication, Company/Employee management, Project & Unit Inventory, Inquiry, Contact, Site Visit, Quotation, Negotiation, Booking, and a stubbed ERP integration.

The codebase is **well-structured, consistent, and readable**. Multi-tenant scoping (`companyId`) is applied consistently, the response envelope is standardized, and the module boundaries are clean. However, the audit found **several critical business-logic and security gaps** that make the system unsafe for production in its current state — most notably the ability to **double-book a unit**, **publicly accessible booking documents**, and **unenforced unit-availability rules** that the module specification explicitly requires.

### Overall Project Health
🟠 **Moderate** — Solid foundation and clean architecture, but core sales-integrity and security invariants are not enforced.

### Overall Quality Score
**63 / 100**

| Metric | Count |
|--------|-------|
| **Total Issues Found** | 34 |
| 🔴 Critical | 3 |
| 🟠 High | 9 |
| 🟡 Medium | 14 |
| 🟢 Low / Enhancement | 8 |

### Headline Findings
1. A unit can be booked even when it is already `RESERVED`/`SOLD`, and two inquiries can book the **same unit** — no availability guard exists (double-booking).
2. Uploaded booking documents (ID proofs, signed agreements) are served from a **public static route with no authentication**.
3. The documented rule *"only AVAILABLE units may be selected for a site visit or quotation"* is **not enforced** anywhere.
4. Monetary values use JavaScript `Number` (floating point) despite `Decimal` columns — risk of rounding errors on money.
5. `User.email` is globally unique, which **breaks multi-tenancy** (two companies cannot reuse an email) and crashes admin re-creation.

---

## 2. Bug List

---

### 🔴 BUG-001 — Double-booking: no unit-availability guard at booking creation ✅ RESOLVED
- **Module:** Booking / Project & Unit Inventory
- **Severity:** 🔴 Critical
- **Status:** ✅ **RESOLVED (2026-07-01)** — `createBooking` now rejects any unit whose status is not `AVAILABLE` (early 409), and reserves the unit atomically inside the transaction via a conditional `updateMany({ where: { id, status: 'AVAILABLE' }})` that asserts `count === 1`. If a concurrent booking wins the race, the transaction rolls back and a 409 is returned, so no two bookings can back the same unit.
- **Risk Level:** Business Logic Risk / Data Loss
- **Description:** `createBooking` verifies the inquiry, quotation (must be `ACCEPTED`), and that the unit belongs to the company — but it never checks that the unit is currently `AVAILABLE`. Because `Booking.unitId` has no uniqueness constraint (only `inquiryId` is unique), two different inquiries can each have an accepted quotation on the **same unit** and both can be booked. The second booking silently re-sets an already-`RESERVED`/`SOLD` unit to `RESERVED`.
- **Expected Behaviour:** Booking must fail if the unit is not `AVAILABLE`. Business Rule 4/5 requires a `RESERVED`/`SOLD` unit to be unbookable. The unit → `RESERVED` transition should be atomic and mutually exclusive.
- **Current Behaviour:** Any accepted quotation can be booked regardless of unit status; the same unit can back multiple confirmed bookings.
- **Root Cause:** Missing `unit.status === 'AVAILABLE'` validation and missing DB-level guard (no conditional update / no unique constraint on active bookings per unit).
- **Recommended Fix:** Inside the booking transaction, re-read the unit `FOR UPDATE` (or use a conditional `updateMany` on `{ id, status: 'AVAILABLE' }` and assert `count === 1`); reject if not available. Consider a partial unique index preventing more than one active (`CONFIRMED`) booking per unit.
- **Impact:** Booking, Unit inventory integrity, ERP sales orders, Quotation flow, financial reporting.

---

### 🔴 BUG-002 — Booking documents publicly accessible without authentication ✅ RESOLVED
- **Module:** File Uploads / Booking / Security
- **Severity:** 🔴 Critical
- **Status:** ✅ **RESOLVED (2026-07-01)** — Booking documents are no longer served from the public static path. `server.js` now only serves `/uploads/companies` (low-sensitivity logos) statically. A new authenticated, tenant-scoped route `GET /api/bookings/:id/documents/:documentId/download` verifies the booking belongs to the caller's company (and requires a CRM role) before streaming the file. The frontend `DocumentUploader` now downloads via this authenticated endpoint (blob + JWT) instead of a public `<a href>`.
- **Risk Level:** Security Risk / Data Loss
- **Description:** `server.js` serves `app.use('/uploads', express.static(...))` with no auth middleware. Uploaded booking documents include `ID_PROOF`, `SIGNED_AGREEMENT`, and `PAYMENT_PROOF`. Anyone with (or guessing) the URL — including unauthenticated users and users of other tenants — can download these files. Company logos are similarly public (lower sensitivity).
- **Expected Behaviour:** Sensitive documents must be access-controlled: only authenticated users of the owning company (with an appropriate role) should retrieve a booking document.
- **Current Behaviour:** Files are world-readable static assets; the only protection is the unguessability of the `Date.now()-random.ext` filename.
- **Root Cause:** Static file serving used for private tenant data; no authenticated download endpoint.
- **Recommended Fix:** Serve documents through an authenticated controller route (`GET /api/bookings/:id/documents/:documentId/download`) that verifies company ownership and streams the file; store uploads outside the public static path.
- **Impact:** Booking, Contact PII, regulatory/compliance exposure, all tenants.

---

### 🔴 BUG-003 — Monetary math performed with floating-point `Number` ✅ RESOLVED
- **Module:** Quotation / Unit / Booking / Database
- **Severity:** 🔴 Critical (financial correctness)
- **Status:** ✅ **RESOLVED (2026-07-01)** — All persisted money/dimension math now uses `Prisma.Decimal` (decimal.js-backed, already bundled with `@prisma/client`) instead of JS `Number`. `calcPricing` computes `area`/`basePrice` as Decimals; quotation `basePrice`, `charges.amount`, `chargesTotal`, and `totalAmount` are Decimal; booking `finalAmount`/`discountAmount`/`bookingAmount` and `BookingPayment.amount` are Decimal; negotiation `offeredPrice`/`discountAmount` are Decimal. Verified `0.1 + 0.2 = 0.3` exactly. `Number()` remains only for input validation and display-string formatting (not persisted); ERP stub arguments keep their documented `number` contract signature.
- **Risk Level:** Data Loss / Business Logic Risk
- **Description:** Prices are `Decimal` in Prisma, but all calculations coerce to JS `Number`: `calcPricing` (`area = Number(width) * Number(length)`, `basePrice = area * Number(pricePerSqFt)`), quotation `totalAmount = basePrice + charges.reduce(... Number(c.amount))`, and booking amounts. Floating-point arithmetic on currency introduces rounding errors (e.g., `0.1 + 0.2`) that compound across charges and get persisted.
- **Expected Behaviour:** Money should be computed with a decimal-safe library (`Prisma.Decimal`, `decimal.js`, or integer minor units) so persisted totals are exact.
- **Current Behaviour:** Totals are computed as binary floats then written to `Decimal(65,30)` columns.
- **Root Cause:** Convenience use of `Number()` on `Decimal` fields.
- **Recommended Fix:** Use `Prisma.Decimal` / `decimal.js` for all pricing math; never round-trip money through `Number`.
- **Impact:** Quotation totals, booking final/booking amounts, ERP invoice amounts, receipts, reporting.

---

### 🟠 BUG-004 — "Only AVAILABLE units" rule not enforced for quotations and site visits ✅ RESOLVED
- **Module:** Quotation / Site Visit / Project & Unit Inventory
- **Severity:** 🟠 High
- **Status:** ✅ **RESOLVED (2026-07-01)** — Business Rule 4 is now enforced. `createQuotation` rejects a non-`AVAILABLE` unit with `400`. `createSiteVisit` and `updateSiteVisit` reject a non-`AVAILABLE` unit (when a `unitId` is provided/changed) with `400`. Each returns a clear message including the current unit status.
- **Risk Level:** Business Logic Risk
- **Description:** Business Rule 4 states only `AVAILABLE` units may be selected. `createQuotation`, `createSiteVisit`, and `updateSiteVisit` only verify the unit belongs to the company — never its status. Quotations and site visits can therefore be created against `RESERVED` or `SOLD` units.
- **Expected Behaviour:** Reject selection of non-`AVAILABLE` units with a clear validation error.
- **Current Behaviour:** Any company unit is selectable regardless of status.
- **Root Cause:** Missing `status === 'AVAILABLE'` check on unit lookups in these flows.
- **Recommended Fix:** Add availability validation in quotation/site-visit creation (and unit change on update); return `400` if the unit is not available.
- **Impact:** Quotation, Site Visit, Booking, inventory accuracy.

---

### 🟠 BUG-005 — Manual unit-status endpoint allows setting `RESERVED` and unguarded transitions ✅ RESOLVED
- **Module:** Project & Unit Inventory
- **Severity:** 🟠 High
- **Status:** ✅ **RESOLVED (2026-07-01)** — `updateUnitStatus` now accepts only `AVAILABLE` and `SOLD` (new `MANUAL_STATUSES` whitelist); `RESERVED` is rejected with `400` since it is managed exclusively by the booking flow. Before applying any change, the endpoint checks for a `CONFIRMED` booking on the unit and rejects with `409` if one exists, preventing manual status changes that contradict an active booking. The frontend status dropdown (`ProjectDetailPage`) no longer offers `RESERVED`.
- **Risk Level:** Business Logic Risk
- **Description:** The spec (§9.2 note & Rule 5) states `PATCH /api/units/:id/status` must handle only `AVAILABLE ↔ SOLD`, never `RESERVED`. But `updateUnitStatus` accepts the full `VALID_STATUSES` set including `RESERVED`, with no guard. It also allows flipping a `RESERVED` (actively booked) unit back to `AVAILABLE` or `SOLD` with no check for an existing active booking, desynchronising unit state from bookings.
- **Expected Behaviour:** Reject manual `RESERVED`; block transitions that contradict an active booking.
- **Current Behaviour:** Any status can be set at any time.
- **Root Cause:** No transition state-machine; `RESERVED` not excluded.
- **Recommended Fix:** Restrict manual endpoint to `AVAILABLE`/`SOLD`; validate against active bookings before allowing a change.
- **Impact:** Booking integrity, inventory accuracy, ERP.

---

### 🟠 BUG-006 — `User.email` globally unique breaks multi-tenancy and admin re-creation ✅ RESOLVED (admin re-creation)
- **Module:** Authentication / Company / Employee / Database
- **Severity:** 🟠 High
- **Status:** ✅ **RESOLVED (2026-07-01)** — Fixed via the audit's record-reuse strategy (schema-level per-company scoping was rejected because `login` looks up users by email alone via `findUnique({ where: { email } })`; scoping email per company would break authentication and require a company-selector redesign — out of scope per minimal-change rules). `setCompanyAdmin` now (1) blocks only *cross-company* email collisions (`NOT: { companyId }`) with a clear 409, and (2) inside the transaction, reuses/rotates any existing same-company user with that email (reactivating it and setting role ADMIN) instead of creating a duplicate — so re-appointing a previously-used admin email no longer throws `P2002`. A `P2002` fallback now returns a friendly 409. **Note:** the broader cross-tenant email-sharing limitation (two different companies reusing one email) remains by design of the global unique constraint and is documented as a known limitation pending an auth-flow redesign.
- **Risk Level:** Business Logic Risk / System Breaking
- **Description:** `User.email` is a global `@unique`. (1) Two different companies cannot have users sharing an email (e.g., an external consultant). (2) `setCompanyAdmin` deactivates the old ADMIN (`isActive=false`) but leaves the row — so creating a new admin with a **previously used email** throws a Prisma `P2002` and returns a generic 409, and re-appointing the same person is impossible. The conflict pre-check (`NOT: { companyId, role: 'ADMIN' }`) does not cover this case.
- **Expected Behaviour:** Email uniqueness should be scoped per company (`@@unique([companyId, email])`), or admin replacement should reuse/rotate the existing record.
- **Current Behaviour:** Cross-tenant email collisions and dead deactivated admins block valid operations.
- **Root Cause:** Global unique constraint + soft-deactivation strategy.
- **Recommended Fix:** Scope uniqueness per company, or update the existing admin record instead of creating a new one.
- **Impact:** Company onboarding, employee management, admin rotation.

---

### 🟠 BUG-007 — Failed login triggers full-page redirect that wipes the error message ✅ RESOLVED
- **Module:** Authentication / Frontend / UI-UX
- **Severity:** 🟠 High
- **Status:** ✅ **RESOLVED (2026-07-01)** — The axios response interceptor now skips the global 401 redirect when the failing request is `/auth/login` (checked via `error.config.url`) or when the user is already on `/login`. A failed login therefore rejects normally, allowing `LoginPage` to render "Invalid credentials". Token-expiry redirects for all other authenticated requests are unchanged.
- **Risk Level:** UI/UX
- **Description:** The axios response interceptor redirects to `/login` via `window.location.href` on **any** `401`. A failed login (`POST /auth/login`) returns `401 Invalid credentials`, so the interceptor reloads the page before `LoginPage` can render the error state — the user sees a reload rather than an error message and cannot tell why login failed.
- **Expected Behaviour:** Auth endpoints should be exempt from the global 401-redirect so the login form can display "Invalid credentials".
- **Current Behaviour:** Login failure causes a page reload; error message never shown.
- **Root Cause:** Interceptor treats all 401s identically, including the login request itself.
- **Recommended Fix:** Skip the redirect when the failing request is `/auth/login` (or when already on `/login`); let the component handle the error.
- **Impact:** Login UX, perceived reliability.

---

### 🟠 BUG-008 — No validation of booking financials or payment totals ✅ RESOLVED
- **Module:** Booking / Payments
- **Severity:** 🟠 High
- **Status:** ✅ **RESOLVED (2026-07-01)** — `createBooking` now enforces decimal-safe financial invariants against the accepted quotation total: `discountAmount` must be non-negative and `≤ quotation.totalAmount`, `finalAmount ≤ quotation.totalAmount`, and `bookingAmount ≤ finalAmount` (each returns `400` on violation). `addPayment` now rejects payments against a `CANCELLED` booking (`400`) and prevents over-payment by aggregating existing `BookingPayment` amounts and rejecting when cumulative payments would exceed `finalAmount` (reporting the remaining balance).
- **Risk Level:** Business Logic Risk / Data Loss
- **Description:** `createBooking` validates only that `finalAmount` and `bookingAmount` are positive. There is no check that `bookingAmount <= finalAmount`, that `discountAmount` is consistent with quotation total and final amount, or that cumulative `BookingPayment` amounts don't exceed `finalAmount`. `addPayment` also allows recording payments against a `CANCELLED` booking.
- **Expected Behaviour:** Enforce `bookingAmount <= finalAmount`, non-negative discount within bounds, and prevent over-payment / payments on cancelled bookings.
- **Current Behaviour:** Arbitrary financial values accepted.
- **Root Cause:** Missing cross-field and aggregate validation.
- **Recommended Fix:** Add server-side financial invariants; reject inconsistent amounts and payments on non-active bookings.
- **Impact:** Payments, receipts, ERP invoices, financial reporting.

---

### 🟠 BUG-009 — SALES_EXECUTIVE can assign inquiries via creation, bypassing manager-only assignment ✅ RESOLVED
- **Module:** Inquiry / Permissions
- **Severity:** 🟠 High
- **Status:** ✅ **RESOLVED (2026-07-01)** — `createInquiry` now derives an `effectiveAssignedToId`: for a `SALES_EXECUTIVE` it is forced to `req.user.id` (self-assign only), while `ADMIN`/`MANAGER` may still assign to any active company user. All downstream logic (assignee validation, the created inquiry's `assignedToId`, and the activity-log message) uses the effective value, so sales execs can no longer assign work to others through the create path — consistent with the manager-only `PATCH /:id/assign` endpoint.
- **Risk Level:** Security Risk (authorization)
- **Description:** `PATCH /inquiries/:id/assign` is restricted to ADMIN/MANAGER. But `POST /inquiries` is open to all CRM roles and accepts a free `assignedToId`, so a SALES_EXECUTIVE can create an inquiry and assign it to any user — the exact action the assign endpoint restricts.
- **Expected Behaviour:** Assignment authority should be consistent. Either sales execs may only self-assign at creation, or assignment on create is manager-gated too.
- **Current Behaviour:** Sales execs can assign work to others through the create path.
- **Root Cause:** Inconsistent authorization between create and assign flows.
- **Recommended Fix:** For SALES_EXECUTIVE, force `assignedToId = req.user.id` on create (or validate against role policy).
- **Impact:** Inquiry ownership, workload governance.

---

### 🟠 BUG-010 — SUPER_ADMIN cannot manage Projects/Units despite documented full access ✅ RESOLVED
- **Module:** Project & Unit Inventory / Permissions
- **Severity:** 🟠 High
- **Status:** ✅ **RESOLVED (2026-07-01)** — Resolved via the audit's spec-correction option. The implementation is intentionally tenant-scoped (project/unit routes authorize only `ADMIN`/`MANAGER`/`SALES_EXECUTIVE`; controllers scope by `req.user.companyId`, which is `null` for SUPER_ADMIN), consistent with the rest of the multi-tenant design. Implementing cross-company SUPER_ADMIN inventory access would require adding explicit company-selection to every project/unit endpoint — a redesign contradicting the tenant model and out of scope for a minimal fix. The module spec §7 (`0-project-unit-management-module.md`) has been updated to accurately describe SUPER_ADMIN as platform-administration-only, with a note documenting the divergence and how cross-company access should be added if ever needed.
- **Risk Level:** Business Logic Risk
- **Description:** Module spec §7 grants SUPER_ADMIN "full access across all companies" for projects and units. In practice, all project/unit routes authorize only `ADMIN/MANAGER/SALES_EXECUTIVE`, and controllers rely on `req.user.companyId`, which is `null` for SUPER_ADMIN. SUPER_ADMIN is effectively locked out of inventory management.
- **Expected Behaviour:** Either implement documented SUPER_ADMIN cross-company access, or update the spec to reflect the intended tenant-scoped model.
- **Current Behaviour:** SUPER_ADMIN has no working project/unit access.
- **Root Cause:** Company-scoped controllers with no super-admin branch; spec/impl divergence.
- **Recommended Fix:** Add SUPER_ADMIN handling (explicit company selection) or correct the specification.
- **Impact:** Platform administration, documentation trust.

---

### 🟠 BUG-011 — No unit-release / booking cancellation flow (CANCELLED status unreachable) ✅ RESOLVED
- **Module:** Booking / Project & Unit Inventory
- **Severity:** 🟠 High
- **Status:** ✅ **RESOLVED (2026-07-01)** — Implemented `POST /api/bookings/:id/cancel` (ADMIN/MANAGER only). It runs an atomic transaction that sets the booking to `CANCELLED`, releases the unit back to `AVAILABLE` (via a conditional `updateMany` guarded on `status: 'RESERVED'` so a manually-SOLD unit is never downgraded), reverts the inquiry from `BOOKED` to `NEGOTIATION`, and logs an activity (with optional reason). Re-cancelling a `CANCELLED` booking returns `400`. ERP reversal is intentionally deferred (the Phase-1 `erpSync.js` stub has no reversal contract) with a code comment marking where it belongs. Frontend: `BookingDetailPage` now shows a "Cancel Booking" action (managers, `CONFIRMED` only) with a confirmation modal and optional reason, wired through `bookingService.cancelBooking`.
- **Risk Level:** Business Logic Risk
- **Description:** `BookingStatus` includes `CANCELLED`, but there is no endpoint to cancel a booking. Consequently a `RESERVED` unit can never be programmatically released back to `AVAILABLE`, and the inquiry cannot be reverted from `BOOKED`. The only recovery is the unguarded manual status endpoint (see BUG-005).
- **Expected Behaviour:** A cancellation flow should set booking `CANCELLED`, release the unit to `AVAILABLE`, revert the inquiry stage, and (ideally) trigger ERP reversal.
- **Current Behaviour:** Bookings are permanent; units stay locked.
- **Root Cause:** Feature not implemented.
- **Recommended Fix:** Implement `POST /bookings/:id/cancel` with an atomic transaction that unlocks the unit.
- **Impact:** Booking lifecycle, inventory recovery, ERP.

---

### 🟠 BUG-012 — No brute-force protection / rate limiting on authentication ✅ RESOLVED
- **Module:** Authentication / Security
- **Severity:** 🟠 High
- **Status:** ✅ **RESOLVED (2026-07-01)** — Added `express-rate-limit@7.5.0` (pinned) and a new `rateLimitMiddleware.js` exposing a `loginRateLimiter` (max 10 attempts per IP per 15-minute window) applied to `POST /api/auth/login`. On limit exceed it returns `429` in the standard `{ success, message, data }` envelope with a friendly message, throttling online password guessing. **Ops note:** if deployed behind a reverse proxy, set `app.set('trust proxy', …)` so the limiter keys on the real client IP.
- **Risk Level:** Security Risk
- **Description:** `POST /auth/login` has no rate limiting, throttling, or lockout. Combined with bcrypt cost 10, this permits online password guessing.
- **Expected Behaviour:** Apply IP/account rate limiting and progressive backoff or lockout.
- **Current Behaviour:** Unlimited login attempts.
- **Root Cause:** No rate-limit middleware (e.g., `express-rate-limit`) configured.
- **Recommended Fix:** Add rate limiting on auth routes and consider account lockout/alerting.
- **Impact:** All accounts, tenant security.

---

### 🟡 BUG-013 — `StatusBadge` duplicate object keys break Project-status styling and labels ✅ RESOLVED
- **Module:** Shared Components / UI-UX
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — Removed the duplicate label-string entries for `UPCOMING`/`UNDER_CONSTRUCTION`/`READY_TO_MOVE` from `STATUS_COLORS` (they were overriding the real CSS classes, producing invalid classNames). Added `UPCOMING`/`UNDER_CONSTRUCTION`/`READY_TO_MOVE` human labels to `STATUS_LABELS` (`COMPLETED` was already present, so it was not duplicated). Project statuses now render with the correct colors and readable labels.
- **Risk Level:** UI/UX
- **Description:** In `STATUS_COLORS`, keys `UPCOMING`, `UNDER_CONSTRUCTION`, `READY_TO_MOVE` are declared **twice** — first with CSS classes, later with label strings (`'Upcoming'`, `'Under Construction'`, `'Ready to Move'`). In a JS object literal the later value wins, so `colorClass` becomes an invalid className (e.g., `"Under Construction"`), and those project statuses render with no color. They are also missing from `STATUS_LABELS`, so the badge shows the raw enum (`UPCOMING`).
- **Expected Behaviour:** Project statuses show proper colors and human labels.
- **Current Behaviour:** Broken/uncolored badges with raw enum text for project statuses.
- **Root Cause:** Copy-paste duplication of keys across color and label maps.
- **Recommended Fix:** Remove the label-string entries from `STATUS_COLORS`; add the four project statuses to `STATUS_LABELS`.
- **Impact:** Project list/detail pages.

---

### 🟡 BUG-014 — Missing database indexes on foreign keys and filter columns ✅ RESOLVED
- **Module:** Database / Performance
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — Added `@@index` declarations across the schema for foreign-key and hot filter columns and created/applied migration `20260701075539_add_indexes`. Indexes added: `User.companyId`; `Project.companyId`; `Broker.companyId`; `Inquiry` (companyId, contactId, projectId, brokerId, assignedToId, createdById, stage); `FollowUp` (inquiryId, createdById, scheduledAt); `ActivityLog` (inquiryId, performedById); `Interaction` (contactId, inquiryId, createdById); `SiteVisit` (inquiryId, unitId, createdById, status, scheduledAt); `Unit.status`; `Quotation` (inquiryId, unitId, createdById, decision); `QuotationCharge.quotationId`; `Negotiation` (inquiryId, quotationId, createdById); `Booking` (quotationId, unitId, bookedById, status); `BookingPayment` (bookingId, createdById); `BookingDocument` (bookingId, uploadedById). (`Contact.companyId` and `Unit.projectId` are already covered by their existing composite `@@unique` prefixes.)
- **Risk Level:** Performance Risk
- **Description:** Migrations create only PK and unique indexes. PostgreSQL does not auto-index FK columns, yet nearly every query filters/joins on `companyId`, `projectId`, `inquiryId`, `contactId`, `assignedToId`, `stage`, `status`, etc. At scale these become sequential scans.
- **Expected Behaviour:** Hot filter/FK columns should be indexed (`@@index`).
- **Current Behaviour:** No secondary indexes.
- **Root Cause:** No `@@index` declarations in the schema.
- **Recommended Fix:** Add indexes for `companyId`, relation FKs, and common filters (`stage`, `status`, `scheduledAt`).
- **Impact:** All list endpoints as data grows.

---

### 🟡 BUG-015 — Unbounded list results / no maximum page size ✅ RESOLVED
- **Module:** APIs / Performance
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — Added a shared `utils/pagination.js` `getPagination()` helper that parses and **clamps** client params (`page ≥ 1`, `pageSize` within `[1, 100]`, default 20). Applied it to every paginated list endpoint (inquiries, contacts, interactions, site visits, quotations, bookings, companies, employees). `GET /api/units`, which previously returned every unit, is now paginated (default/cap 100) while keeping its `items` array shape for backward compatibility with the unit picker.
- **Risk Level:** Performance Risk
- **Description:** Paginated endpoints accept `pageSize` from the client with no upper cap (`take: parseInt(pageSize)`), so a caller can request an enormous page. `GET /api/units` has **no pagination at all** and returns every unit for the company.
- **Expected Behaviour:** Cap `pageSize` (e.g., ≤100) and paginate the units list.
- **Current Behaviour:** Client controls result size; units unbounded.
- **Root Cause:** Missing clamp/validation on pagination parameters.
- **Recommended Fix:** Clamp `pageSize`, add pagination to units.
- **Impact:** Memory/latency, potential DoS.

---

### 🟡 BUG-016 — Inquiry stage has no transition validation (state machine) ✅ RESOLVED
- **Module:** Inquiry / Business Logic
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — `changeStage` now enforces a `STAGE_TRANSITIONS` state machine. Manual assignment of `BOOKED` is rejected (reachable only via the booking flow); transitions out of `BOOKED` are disallowed here (managed by booking cancellation); same-stage no-ops and any transition not in the allowed map return `400`. Forward pipeline moves, limited backward corrections, marking `NOT_INTERESTED`, and reopening a lost lead are permitted.
- **Risk Level:** Business Logic Risk
- **Description:** `changeStage` accepts any valid enum value with no ordering rules. A user can jump an inquiry straight to `BOOKED` (without any booking, unit lock, or quotation) or revert `BOOKED → NEW`, desynchronising it from the actual booking.
- **Expected Behaviour:** Enforce allowed transitions; `BOOKED` should be reachable only via the booking flow.
- **Current Behaviour:** Arbitrary stage changes permitted.
- **Root Cause:** No transition guard.
- **Recommended Fix:** Implement an allowed-transition map; block manual `BOOKED`.
- **Impact:** Pipeline integrity, reporting.

---

### 🟡 BUG-017 — Weak, low-entropy JWT secret with short lifetime and no refresh ✅ RESOLVED (secret strength)
- **Module:** Authentication / Security
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — Replaced the committed placeholder `crm-jwt-secret-key-phase1-2024` with a 96-character (48-byte) cryptographically-random hex secret in `.env`. Added a startup guard in `server.js` that calls `process.exit(1)` if the secret matches any known-weak value or is shorter than 32 characters, preventing accidental production deployment with a weak secret. Note: refresh-token / longer-session UX improvement is tracked as a known Phase-2 enhancement.
- **Risk Level:** Security Risk
- **Description:** `JWT_SECRET="crm-jwt-secret-key-phase1-2024"` is a short, human-readable, predictable string. There is no refresh-token mechanism; sessions silently expire after 8h forcing re-login mid-work.
- **Expected Behaviour:** Use a long random secret from a secrets manager; consider refresh tokens.
- **Current Behaviour:** Guessable secret; abrupt expiry.
- **Root Cause:** Placeholder secret committed to `.env` (file is gitignored, but the value is weak by design).
- **Recommended Fix:** Generate a high-entropy secret per environment; add refresh flow if longer sessions are needed.
- **Impact:** Token security, session UX.

---

### 🟡 BUG-018 — `ActivityType` enum misused across controllers ✅ RESOLVED
- **Module:** Inquiry / Quotation / Booking / Site Visit / Code Quality
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — Extended `ActivityType` enum with 9 new values: `QUOTATION_CREATED`, `QUOTATION_DECISION_UPDATED`, `NEGOTIATION_RECORDED`, `SITE_VISIT_COMPLETED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `INTERACTION_LOGGED`, `INQUIRY_UPDATED`, `INQUIRY_QUALIFIED`. Updated all misused `STAGE_CHANGED`/`NOTE_ADDED` call sites across 5 controllers to use the appropriate type. Migration `20260701091403_extend_activity_type_enum` applied.
- **Risk Level:** Code Quality / Business Logic Risk
- **Description:** Quotation creation, quotation decision, negotiation, booking confirmation, and site-visit completion all log activities with `type: 'STAGE_CHANGED'` (or `NOTE_ADDED`) because the `ActivityType` enum has no values for these events. The activity timeline therefore mislabels events, weakening the audit trail.
- **Expected Behaviour:** Distinct activity types (e.g., `QUOTATION_CREATED`, `BOOKING_CONFIRMED`, `SITE_VISIT_COMPLETED`).
- **Current Behaviour:** Semantically wrong activity types.
- **Root Cause:** Enum not extended for downstream modules.
- **Recommended Fix:** Extend `ActivityType` and use accurate values.
- **Impact:** Audit trail, activity timeline UI.

---

### 🟡 BUG-019 — SALES_EXECUTIVE has full read/write over all company records (no ownership scoping) ✅ RESOLVED
- **Module:** Inquiry / Contact / Quotation / Booking / Permissions
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — Added a `requireAssignedTo` middleware in `inquiryRoutes.js` that enforces SALES_EXECUTIVE ownership on inquiry write operations (PUT update, PATCH stage, PATCH qualify, POST/PATCH follow-ups). ADMIN/MANAGER bypass the check. Reads remain company-wide for pipeline visibility. This is the most defensible scope given the ambiguous business intent noted in the audit.
- **Risk Level:** Security Risk (authorization)
- **Description:** CRM endpoints scope by `companyId` but not by ownership. A SALES_EXECUTIVE can view and edit any inquiry, contact, quotation, or booking in the company, including records assigned to others and changing their stages. Whether this is intended is unclear, but no least-privilege boundary exists per assignee.
- **Expected Behaviour:** If required, restrict sales execs to records assigned to them (or read-only on others).
- **Current Behaviour:** Company-wide write access for all CRM roles.
- **Root Cause:** No row-level ownership checks.
- **Recommended Fix:** Introduce ownership-aware authorization where the business requires it.
- **Impact:** Data governance across a sales team.

---

### 🟡 BUG-020 — `completeSiteVisit` logs completion but does not advance inquiry stage ✅ RESOLVED
- **Module:** Site Visit / Inquiry
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — `createSiteVisit` now atomically advances the inquiry to `SITE_VISIT_SCHEDULED` when the inquiry is in an earlier stage (`NEW`/`CONTACTED`/`QUALIFIED`). `completeSiteVisit` now includes a conditional `inquiry.updateMany` inside the transaction that advances the inquiry from `SITE_VISIT_SCHEDULED` to `NEGOTIATION`, keeping the pipeline in sync with the site-visit lifecycle.
- **Risk Level:** Business Logic Risk
- **Description:** Completing a site visit writes an activity log (mislabeled `STAGE_CHANGED`) but does not update the inquiry stage, so the pipeline does not reflect that a visit occurred. Conversely, creating a site visit does not move the inquiry to `SITE_VISIT_SCHEDULED`.
- **Expected Behaviour:** Site-visit lifecycle should optionally drive inquiry stage per the documented workflow.
- **Current Behaviour:** Stage and site-visit status drift apart.
- **Root Cause:** No stage synchronization.
- **Recommended Fix:** Advance/record stage transitions on schedule/complete as the workflow dictates.
- **Impact:** Pipeline accuracy, reporting.

---

### 🟡 BUG-021 — Contact creation only possible implicitly via inquiry; no standalone endpoint ✅ RESOLVED
- **Module:** Contact
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — Added `POST /api/contacts` with full field validation (`fullName`, `phone` required; optional `email`, `company_name`, `address`, `budgetMin`, `budgetMax`, `preferredArea`) and `P2002` handling for duplicate phone. Exported `createContact` from controller and registered route (open to all CRM roles). Also fixed `resolveContact` in `inquiryController` to capture all provided fields (budget, address, preferredArea, company_name) when creating a contact from an inquiry — previously only `fullName`/`phone`/`email` were stored.
- **Risk Level:** Enhancement / Business Logic
- **Description:** Contacts can only be created as a side effect of `createInquiry` (`resolveContact`). There is no `POST /api/contacts`, so a company cannot register a lead/contact before an inquiry exists. Additionally `resolveContact` ignores `budgetMin/Max`, `address`, `preferredArea`, and `company_name`, so those fields can only ever be set later via update.
- **Expected Behaviour:** Allow direct contact creation with full field capture.
- **Current Behaviour:** Contacts are inquiry-derived and partially populated.
- **Root Cause:** Contact CRUD limited to list/get/update.
- **Recommended Fix:** Add a create-contact endpoint and pass all provided fields in `resolveContact`.
- **Impact:** Contact management completeness.

---

### 🟡 BUG-022 — Dashboard shows placeholder metrics only (not implemented) ✅ RESOLVED
- **Module:** Dashboard / Frontend
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — Added `GET /api/stats` (new `statsController` + `statsRoutes`, mounted in `index.js`). SUPER_ADMIN receives `{ companies: { total, active, suspended } }`; company users receive `{ openInquiries, contacts, siteVisitsToday, pendingQuotations, confirmedBookings }`. `DashboardPage` now fetches on mount via `statsService`, renders real counts in each `StatCard`, and degrades gracefully on error (shows `—`). Removed the "widgets will populate…" placeholder message.
- **Risk Level:** UI/UX / Missing Feature
- **Description:** `DashboardPage` renders static `"—"` values and a note that "widgets will populate…". No stats API exists; the landing page after login is non-functional.
- **Expected Behaviour:** Real counts (open inquiries, contacts, today's site visits, pending quotations, recent bookings, company totals).
- **Current Behaviour:** Empty placeholders.
- **Root Cause:** Feature deferred; no aggregation endpoints.
- **Recommended Fix:** Add dashboard aggregation endpoints and wire them in.
- **Impact:** First impression, daily usability.

---

### 🟡 BUG-023 — Duplicate validation logic scattered across controllers ✅ RESOLVED
- **Module:** Backend / Code Quality
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — Created `src/utils/constants.js` as a single source of truth for all enum whitelists (`VALID_INQUIRY_SOURCES`, `VALID_INQUIRY_STAGES`, `VALID_UNIT_STATUSES`, `MANUAL_UNIT_STATUSES`, `VALID_SITE_VISIT_STATUSES`, `MANUAL_SITE_VISIT_STATUSES`, `VALID_QUOTATION_DECISIONS`, `VALID_PAYMENT_MODES`, `VALID_DOCUMENT_TYPES`, `VALID_INTERACTION_TYPES`). All controllers now import from this module, removing inline redeclarations across `inquiryController`, `unitController`, `quotationController`, `bookingController`, `bookingDocumentController`, `siteVisitController`, and `contactController`.
- **Risk Level:** Maintainability
- **Description:** Enum whitelists and validation are re-declared inline in multiple places (`VALID_SOURCES` in create and update inquiry, `VALID_STATUSES` per controller, `VALID_MODES`, date parsing, trim/parse patterns). There is no shared validation layer, so rules can drift between endpoints.
- **Expected Behaviour:** Centralized validation (shared constants + a schema validator like `zod`/`joi`).
- **Current Behaviour:** Copy-pasted validators.
- **Root Cause:** No validation abstraction.
- **Recommended Fix:** Introduce a validation middleware/schema layer and shared enum constants.
- **Impact:** Maintainability, consistency.

---

### 🟡 BUG-024 — Two overlapping paths set an inquiry to QUALIFIED ✅ RESOLVED
- **Module:** Inquiry / Code Quality
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — `changeStage` now delegates to `qualifyInquiry` when `stage === 'QUALIFIED'`, making `qualifyInquiry` the single canonical qualification path with consistent already-qualified guard, `INQUIRY_QUALIFIED` activity type, and notes support, regardless of which endpoint is called.
- **Risk Level:** Code Quality
- **Description:** Both `PATCH /:id/qualify` and `PATCH /:id/stage` (with `stage=QUALIFIED`) set the same stage with different activity logging and different guards (`qualify` blocks re-qualifying, `stage` does not). This is redundant and behaves inconsistently.
- **Expected Behaviour:** One canonical path for qualification.
- **Current Behaviour:** Two divergent paths.
- **Root Cause:** Overlapping endpoints.
- **Recommended Fix:** Consolidate qualification logic.
- **Impact:** API clarity, consistency.

---

### 🟡 BUG-025 — Forced-logout leaves stale token in `sessionStorage` ✅ RESOLVED
- **Module:** Authentication / Frontend
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — The axios 401 interceptor now calls `sessionStorage.removeItem('crm_token')` before redirecting, so the next page load doesn't rehydrate a stale/expired token and re-issue a doomed `/auth/me` request.
- **Risk Level:** Code Quality / Security (minor)
- **Description:** The axios 401 interceptor clears the in-memory `_token` and redirects but does not remove `crm_token` from `sessionStorage`. On the next load `AuthContext` rehydrates the stale token and calls `/auth/me` again. It self-heals (expired token fails and is then cleared), but the flow is fragile and re-issues a doomed request.
- **Expected Behaviour:** Clear `sessionStorage` on forced logout.
- **Current Behaviour:** Stale token persists until the next failed `/me`.
- **Root Cause:** Interceptor does not touch storage.
- **Recommended Fix:** Remove `crm_token` from storage inside the interceptor.
- **Impact:** Auth robustness.

---

### 🟡 BUG-026 — `updateContact` phone-uniqueness race and inconsistent numeric parsing ✅ RESOLVED
- **Module:** Contact / Database
- **Severity:** 🟡 Medium
- **Status:** ✅ **RESOLVED (2026-07-01)** — `updateContact` now catches `P2002` with a field-specific "phone number already exists" 409, handling the concurrency race that could bypass the pre-check. Budget fields now use `Number()` + `Number.isInteger()` validation (rejects decimals and strings like `"12abc"`; range-checks for non-negative) before storing, replacing the loose `parseInt` that silently truncated invalid inputs.
- **Risk Level:** Data Loss (edge) / Code Quality
- **Description:** Phone uniqueness is enforced only by an application-level pre-check (`findFirst`), which is subject to a race under concurrency; the DB `@@unique([companyId, phone])` will then throw a raw `P2002` (surfaced as a generic "already exists"). Budget fields are parsed with `parseInt` (drops decimals / accepts `"12abc"` → `12`) with no range validation.
- **Expected Behaviour:** Rely on the DB constraint with a friendly error; validate numeric inputs.
- **Current Behaviour:** Pre-check + possible raw constraint error; loose numeric parsing.
- **Root Cause:** App-level uniqueness + `parseInt` usage.
- **Recommended Fix:** Catch `P2002` with a field-specific message; validate/normalize numbers.
- **Impact:** Contact edits under load.

---

### 🟢 BUG-027 — Specification/implementation mismatch: Unit model (price vs dimensions) ✅ RESOLVED
- **Module:** Documentation / Project & Unit Inventory
- **Severity:** 🟢 Low
- **Status:** ✅ **RESOLVED (2026-07-01)** — Updated §9.1 Unit Model table in `0-project-unit-management-module.md` to reflect the actual dimension-based implementation (`width`, `length`, `area`, `pricePerSqFt`, `basePrice`) replacing the stale `price` field. Added `updatedAt`. API endpoint table references to `{ unitNumber, price }` noted as superseded.
- **Risk Level:** Code Quality (documentation debt)
- **Description:** The module doc (§9.1) defines `Unit` as `{ unitNumber, price }`, but the implemented schema uses `{ width, length, area, pricePerSqFt, basePrice }` (migration `unit_pricing_dimensions`). Acceptance checklist and API tables in the doc are now stale.
- **Expected Behaviour:** Documentation matches implementation.
- **Current Behaviour:** Divergent.
- **Root Cause:** Model evolved after the doc was written.
- **Recommended Fix:** Update the specification to the dimension-based model.
- **Impact:** Onboarding, spec trust.

---

### 🟢 BUG-028 — `Decimal(65,30)` precision is excessive/inappropriate for currency ✅ RESOLVED
- **Module:** Database
- **Severity:** 🟢 Low
- **Status:** ✅ **RESOLVED (2026-07-01)** — Applied `@db.Decimal` native type annotations: monetary columns (`basePrice`, `totalAmount`, `amount`, `finalAmount`, `discountAmount`, `bookingAmount`, `offeredPrice`, `pricePerSqFt`) use `Decimal(14, 2)`; dimension columns (`width`, `length`) use `Decimal(10, 4)`; `area` uses `Decimal(14, 4)`. Migration `20260701124111_right_size_decimal_precision` applied and Prisma Client regenerated.
- **Risk Level:** Code Quality
- **Description:** Money/dimension columns default to `Decimal(65,30)` (30 fractional digits). This is wasteful and semantically wrong for currency (typically 2–4 dp).
- **Recommended Fix:** Use appropriate precision/scale (e.g., `Decimal(14,2)` for money, a defined scale for dimensions).
- **Impact:** Storage, clarity.

---

### 🟢 BUG-029 — No automated tests anywhere in the project ✅ RESOLVED (foundation)
- **Module:** Whole project / Quality
- **Severity:** 🟢 Low
- **Status:** ✅ **RESOLVED (2026-07-01)** — Installed `jest@29.7.0` and `supertest@7.0.0` (pinned) as devDependencies. Added `jest` config to `package.json` and `npm test` script. Created two test suites covering the most critical regression risks: `tests/utils/pagination.test.js` (5 tests for the BUG-015 pagination utility) and `tests/utils/decimal.test.js` (5 tests for the BUG-003 decimal-safe arithmetic). All 10 tests pass. This is a foundation — the `tests/` directory is ready for additional controller/integration tests.
- **Risk Level:** Maintainability
- **Description:** There is no test framework, unit tests, or integration tests in backend or frontend. Regressions on critical money/booking logic cannot be caught automatically.
- **Recommended Fix:** Add unit tests for pricing/booking invariants and API integration tests.
- **Impact:** Long-term stability.

---

### 🟢 BUG-030 — `LoginPage` calls `navigate()` during render ✅ RESOLVED
- **Module:** Authentication / Frontend
- **Severity:** 🟢 Low
- **Status:** ✅ **RESOLVED (2026-07-01)** — Replaced the render-time `navigate('/dashboard', { replace: true }); return null;` with a declarative `return <Navigate to="/dashboard" replace />;` and imported `Navigate` from `react-router-dom`.
- **Risk Level:** Code Quality
- **Description:** `if (user) { navigate('/dashboard'); return null; }` runs during render, an anti-pattern that can trigger React warnings. Should use `<Navigate>` or an effect.
- **Recommended Fix:** Redirect with `<Navigate to="/dashboard" replace />`.
- **Impact:** React correctness.

---

### 🟢 BUG-031 — Health check does not verify database connectivity
- **Module:** Backend / Ops
- **Severity:** 🟢 Low
- **Risk Level:** Code Quality
- **Description:** `/health` returns success unconditionally; it does not ping the DB, so it cannot detect a down/unreachable database for load-balancer checks.
- **Recommended Fix:** Perform a lightweight `SELECT 1` in the health check.
- **Impact:** Observability.

---

### 🟢 BUG-032 — Inconsistent HTTP verbs and update semantics
- **Module:** APIs / Code Quality
- **Severity:** 🟢 Low
- **Risk Level:** Code Quality
- **Description:** Updates are mostly `PUT` but site visits use `PATCH /:id`; some "PUT" handlers behave as partial updates. Minor REST inconsistency across modules.
- **Recommended Fix:** Standardize verb/semantics conventions.
- **Impact:** API predictability.

---

### 🟢 BUG-033 — No structured logging; secrets could reach logs
- **Module:** Backend / Security / Ops
- **Severity:** 🟢 Low
- **Risk Level:** Code Quality / Security (minor)
- **Description:** `errorMiddleware` does `console.error('[ERROR]', err)` dumping full errors; ERP stubs `console.log` payloads including contact PII. No log levels/redaction.
- **Recommended Fix:** Adopt a structured logger with redaction and levels.
- **Impact:** Log hygiene, PII exposure in logs.

---

### 🟢 BUG-034 — `logout` endpoint is a no-op (stateless token, no revocation)
- **Module:** Authentication
- **Severity:** 🟢 Low
- **Risk Level:** Enhancement
- **Description:** `POST /auth/logout` just returns success; a stolen token remains valid until expiry. Acceptable for Phase 1 but worth documenting as a known limitation.
- **Recommended Fix:** If needed, add token denylist/short-lived tokens + refresh.
- **Impact:** Session revocation.

---

## 3. Priority Fix Order

### Phase 1 — Critical Fixes (Must Fix First)
- **BUG-001** — Prevent double-booking (unit-availability guard + atomic reserve).
- **BUG-002** — Authenticate/authorize access to uploaded booking documents.
- **BUG-003** — Replace floating-point money math with decimal-safe arithmetic.

### Phase 2 — High Priority Fixes
- **BUG-004** — Enforce AVAILABLE-only for quotations/site visits.
- **BUG-005** — Restrict manual unit-status transitions (no `RESERVED`, guard active bookings).
- **BUG-006** — Scope user email uniqueness per company; fix admin re-creation.
- **BUG-007** — Exempt login from global 401 redirect.
- **BUG-008** — Validate booking financials and payment aggregates.
- **BUG-009** — Consistent inquiry-assignment authorization.
- **BUG-010** — Resolve SUPER_ADMIN project/unit access vs spec.
- **BUG-011** — Implement booking cancellation + unit release.
- **BUG-012** — Add auth rate limiting / lockout.

### Phase 3 — Medium Priority Fixes
- **BUG-013** — Fix `StatusBadge` duplicate keys / project labels.
- **BUG-014** — Add database indexes.
- **BUG-015** — Cap page size; paginate units.
- **BUG-016** — Inquiry stage transition rules.
- **BUG-017** — Strong JWT secret / session strategy.
- **BUG-018** — Extend/correct `ActivityType` usage.
- **BUG-019** — Ownership-aware authorization for sales execs.
- **BUG-020** — Sync site-visit lifecycle with inquiry stage.
- **BUG-021** — Standalone contact creation + full field capture.
- **BUG-022** — Implement dashboard metrics.
- **BUG-023** — Centralize validation.
- **BUG-024** — Consolidate qualification paths.
- **BUG-025** — Clear stale token on forced logout.
- **BUG-026** — Robust contact phone uniqueness + numeric validation.

### Phase 4 — Low Priority Improvements & Enhancements
- **BUG-027** — Update Unit spec to dimension model.
- **BUG-028** — Right-size `Decimal` precision.
- **BUG-029** — Add automated tests.
- **BUG-030** — Fix render-time navigation on login.
- **BUG-031** — DB-aware health check.
- **BUG-032** — Standardize HTTP verbs.
- **BUG-033** — Structured logging + PII redaction.
- **BUG-034** — Document/handle stateless logout limitation.

---

## 4. Missing Features (Documented or Expected, Not Implemented)

| # | Feature | Status | Source |
|---|---------|--------|--------|
| 1 | SUPER_ADMIN cross-company project/unit management | Not implemented | Module spec §7 |
| 2 | Booking cancellation + unit release to AVAILABLE | Not implemented | `BookingStatus.CANCELLED` exists but unused |
| 3 | Enforcement of "AVAILABLE-only" unit selection | Not implemented | Business Rule 4 |
| 4 | Dashboard statistics / widgets | Placeholder only | `DashboardPage` |
| 5 | Standalone contact creation | Not implemented | Contact routes (list/get/update only) |
| 6 | SUPER_ADMIN dashboard company counts | Placeholder only | `DashboardPage` |
| 7 | Password reset / forgot-password flow | Not implemented | Auth controller |
| 8 | Refresh-token / session renewal | Not implemented | 8h hard expiry |
| 9 | Full contact profile on inquiry-created contacts (budget, area, address) | Partial | `resolveContact` |
| 10 | Real ERP integration | Stub (by design, Phase 1) | `erpSync.js` |
| 11 | Inquiry stage transition state machine | Not implemented | Inquiry workflow |
| 12 | Automated test suite | Not implemented | Whole project |

---

## 5. Technical Debt

**Code smells**
- `ActivityType` overloaded with `STAGE_CHANGED`/`NOTE_ADDED` for unrelated events (BUG-018).
- Two competing qualification paths (BUG-024).
- Render-time navigation in `LoginPage` (BUG-030).
- `console.*` used as logging (BUG-033).

**Duplicate logic**
- Enum whitelists (`VALID_SOURCES`, `VALID_STATUSES`, `VALID_MODES`, `VALID_STAGES`) duplicated across controllers (BUG-023).
- ERP orchestration nearly duplicated between `createBooking` and `retryErpSync` — should share one helper.
- Repeated trim/parse/date-validation boilerplate in every controller.

**Poor abstractions**
- No validation layer (manual per-endpoint checks).
- No service layer — controllers talk directly to Prisma with repeated include blocks.
- Money handled as `Number` rather than a money type (BUG-003, BUG-028).

**Maintainability**
- No tests (BUG-029); refactors are high-risk.
- Spec/impl drift (BUG-027) misleads new contributors.
- Frontend error handling mixes `alert()` (e.g., unit status change) with inline error components — inconsistent UX.

**Scalability**
- Missing indexes (BUG-014) and unbounded/absent pagination (BUG-015) will degrade as data grows.
- Local-disk file storage (`multer` → `/uploads`) is not horizontally scalable; move to object storage for multi-instance deployments.
- Stateless JWT with no revocation limits security controls at scale (BUG-034).

---

## 6. Final Recommendation

**Current Readiness:** ✅ **Ready for Internal Testing** — ❌ Not ready for QA sign-off, Beta, or Production.

The application is coherent, cleanly organized, and functionally broad: all documented modules exist end-to-end, multi-tenant scoping is applied consistently, and the API/response conventions are disciplined. It is suitable for **internal testing and stakeholder demos**.

However, it is **not ready for QA release, Beta, or Production** until Phase 1 and the core Phase 2 items are resolved. Three issues are disqualifying on their own:
- **Double-booking (BUG-001)** compromises the central inventory invariant the entire product is built around.
- **Publicly accessible booking documents (BUG-002)** is a direct data-protection/PII exposure.
- **Floating-point money math (BUG-003)** undermines financial correctness across quotations, bookings, and ERP invoices.

Combined with the unenforced availability rules (BUG-004/005) and the multi-tenant email flaw (BUG-006), these represent correctness and security gaps rather than cosmetic issues.

**Recommended path:** Complete Phase 1 (critical) and the safety/security items in Phase 2, add regression tests around booking/pricing invariants (BUG-029), then re-audit before promoting to QA testing.

---

*This report is the master checklist for the next fixing phase. No source code was modified during this audit.*
