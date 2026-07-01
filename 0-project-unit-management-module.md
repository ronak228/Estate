# Module: Project & Unit Inventory Management

---

## 1. Overview

The Project & Unit Inventory Management module is the **foundation of the entire CRM**. Every downstream module — Inquiry Management, Lead Qualification, Property Viewing & Proposal, and Sales Negotiation & Booking — depends on projects and units existing before any sales activity can begin.

Before a sales team can log an inquiry, schedule a site visit, generate a quotation, or confirm a booking, the company's property portfolio must be defined. This module provides that foundation: it allows the company to register its real estate projects, populate each project with its unit inventory, set unit pricing, and manage availability across the sales lifecycle.

Without this module, the CRM has no properties to sell.

---

## 2. Objectives

- Provide a centralized registry of all real estate **Projects** owned by the company.
- Allow each project to hold a structured inventory of **Units**, each with a unique identifier and a defined price.
- Expose unit availability status (`AVAILABLE`, `RESERVED`, `SOLD`) so that every module downstream can make correct, data-driven decisions.
- Enable administrators and managers to manage the project portfolio and unit inventory without requiring developer intervention.
- Prevent invalid operations — such as booking an already-reserved unit — by enforcing availability rules at the data level.

---

## 3. Real-Life Workflow

This is how a real estate company uses this module from day one:

```
Company is onboarded into the CRM
        ↓
Admin creates a Project (name, location, status)
        ↓
Admin adds Units to the project (unit number, price)
        ↓
Units are now AVAILABLE in the system
        ↓
Sales team can log Inquiries linked to the project
        ↓
Site visits are scheduled against specific units
        ↓
Quotations are generated using the unit's recorded price
        ↓
On booking confirmation, the unit is automatically marked RESERVED
        ↓
Admin or Manager manually marks the unit SOLD once the legal/finance process is complete
```

At each step, the downstream module simply reads from this module — it never needs to duplicate project or unit data.

---

## 4. Features

### 4.1 Project Management

**Purpose:** Register and maintain real estate projects within the company.

**Business Usage:** When a developer launches a new residential or commercial project, the admin creates a project record in the CRM. This record acts as the parent for all units within that project and as the reference point for inquiries.

**Capabilities:**
- Create a project with a name, optional location, and a lifecycle status.
- Edit the project name, location, or status at any time.
- Search and filter projects by name or status.
- View a project's details alongside a summary of its unit inventory.
- Projects cannot be deleted once they are referenced by any inquiry, site visit, quotation, or booking. Use status changes to retire a project instead.

**Expected Outcome:** Every active project in the company's portfolio is visible, searchable, and linkable from inquiry creation onwards.

---

### 4.2 Unit Inventory Management

**Purpose:** Define and manage the individual sellable units that belong to a project.

**Business Usage:** Once a project exists, the admin registers its units — apartments, villas, plots, or commercial spaces — each identified by a unit number and priced accordingly. This inventory is what the sales team presents to customers.

**Capabilities:**
- Add units to a project by specifying a unit number and a price.
- Unit numbers must be unique within the same project (e.g., two units cannot both be "A-101" in the same project).
- Edit a unit's number or price at any time.
- View all units belonging to a project, filterable by availability status.
- Units cannot be deleted once referenced by any sales activity. Use status changes instead.

**Expected Outcome:** A complete, accurate unit inventory exists for every project, ready to be offered to customers.

---

### 4.3 Unit Availability Management

**Purpose:** Track which units are available, reserved, or sold at any given moment.

**Business Usage:** The sales team needs an accurate, real-time view of unit availability before scheduling a site visit or generating a quotation. No two customers should ever be offered the same unit simultaneously.

**Status Values:**

| Status | Meaning | How It Is Set |
|--------|---------|---------------|
| `AVAILABLE` | Unit is on the market and can be selected | Default on creation |
| `RESERVED` | Unit is locked to an active booking | Automatically set by the Booking module at booking confirmation |
| `SOLD` | Unit has been legally transferred | Manually set by Admin or Manager via this module |

**Rules:**
- Only `AVAILABLE` units can be selected for site visits or quotations.
- A unit transitions to `RESERVED` automatically when a booking is confirmed — this is not done manually.
- A unit transitions to `SOLD` manually, after the legal and finance process outside the CRM is complete.
- A `RESERVED` or `SOLD` unit cannot be re-selected for a new sale without first being returned to `AVAILABLE`.

**Expected Outcome:** The availability view is always accurate, preventing double-booking and ensuring customers are only shown genuinely available inventory.

---

### 4.4 Unit Pricing Management

**Purpose:** Maintain an authoritative price record for each unit that all downstream modules rely on.

**Business Usage:** When a sales executive generates a quotation for a customer, the price must come from a single, verified source — not be entered manually each time. This module stores that source price. Any price changes made here apply only to future quotations; quotations already issued to customers retain the price that was recorded at the time of their creation.

**Expected Outcome:** Quotations are always based on the latest approved price for each unit, with historical quotations remaining unaffected by subsequent price updates.

---

### 4.5 Project Status Management

**Purpose:** Reflect the current construction and sales lifecycle stage of each project.

**Business Usage:** A project moves through predictable stages — from upcoming announcement, through construction, to ready-to-move and finally completed. Filtering projects by status helps the sales team focus their efforts and gives management a quick portfolio overview.

**Status Values:**

| Status | Meaning |
|--------|---------|
| `UPCOMING` | Project is announced but not yet under construction |
| `UNDER_CONSTRUCTION` | Project is being built |
| `READY_TO_MOVE` | Project is complete and units can be handed over |
| `COMPLETED` | All units in the project have been sold or transferred |

**Expected Outcome:** Management can filter and report on the portfolio by project lifecycle stage without requiring manual queries.

---

## 5. Module Relationships

This module is the **starting point** of the CRM data hierarchy. All other modules read from or write to it:

```
Company Management
      ↓
Project & Unit Inventory Management  ← THIS MODULE
      ↓
Inquiry Management
  (Inquiry references a Project)
      ↓
Lead Qualification & Contact Management
  (Site Visit references a Unit; Unit availability list is displayed)
      ↓
Property Viewing & Proposal
  (Quotation reads Unit price at creation time)
      ↓
Sales Negotiation & Booking
  (Booking confirmation sets Unit status to RESERVED)
```

**Integration Details:**

| Module | Reads From This Module | Writes To This Module |
|--------|------------------------|----------------------|
| Inquiry Management | Project list (to link inquiry to a project) | — |
| Lead Qualification | Unit list filtered by `AVAILABLE` status | — |
| Property Viewing & Proposal | Unit price (snapshot at quotation time) | — |
| Sales Negotiation & Booking | Unit identity (to confirm the booking) | Sets `Unit.status = RESERVED` on booking confirmation |
| This Module | — | Sets `Unit.status = SOLD` on manual admin action |

---

## 6. Business Rules

1. Every **Project** belongs to exactly one **Company**. A project cannot exist without a company.
2. Every **Unit** belongs to exactly one **Project**. A unit cannot exist without a project.
3. Unit numbers are unique within a project. Attempting to create a duplicate unit number in the same project is rejected with a clear error message.
4. Only **`AVAILABLE`** units may be selected for a site visit or quotation. The system prevents selection of `RESERVED` or `SOLD` units.
5. A unit becomes **`RESERVED`** automatically and exclusively through the Booking module's confirmation process. No manual endpoint sets a unit to `RESERVED`.
6. A unit becomes **`SOLD`** only through a deliberate manual action by an Admin or Manager. This represents external legal/finance confirmation.
7. **Projects and units are never deleted.** Any project or unit with associated sales history (inquiry, site visit, quotation, booking) is retired by updating its status, preserving the full audit trail.
8. The **unit price recorded in a quotation is a snapshot** taken at the moment the quotation is created. Subsequent changes to the unit's price do not alter any existing quotation.
9. Project status is informational and used for filtering only. It does not block or unlock any sales operation.

---

## 7. User Roles

| Role | Permissions |
|------|-------------|
| `SUPER_ADMIN` | Full access across all companies — can create, view, and edit all projects and units |
| `ADMIN` | Full access within their company — can create projects, add units, edit details, and change unit status |
| `MANAGER` | Can create projects, add units, and edit details within their company; can change unit status |
| `SALES_EXECUTIVE` | Read-only access — can view projects and units, and filter by availability; cannot create or edit |

---

## 8. Module Outcome

After this module is complete, the CRM has:

- A managed registry of all company projects, each with a lifecycle status and searchable by name or stage.
- A structured unit inventory per project, with accurate pricing and availability tracking.
- A single source of truth for unit availability that all downstream modules rely on.
- The prerequisite data needed for every other module to function: inquiries can reference projects, site visits can reference units, quotations can read prices, and bookings can lock inventory.

The CRM workflow cannot begin without this module. Once it is in place, the sales team has everything they need to start registering customer inquiries and moving deals through the pipeline.

---

## 9. Technical Implementation

### 9.1 Data Models

#### ProjectStatus Enum
```
UPCOMING | UNDER_CONSTRUCTION | READY_TO_MOVE | COMPLETED
```

#### Project Model
Extends the existing `Project` model with the following additional fields:

| Field | Type | Notes |
|-------|------|-------|
| `status` | `ProjectStatus` | Defaults to `UPCOMING` |
| `units` | `Unit[]` | One-to-many relation |
| `updatedAt` | `DateTime` | Auto-managed |

Existing fields retained: `id`, `companyId`, `company`, `name`, `location`, `inquiries`, `createdAt`.

#### Unit Model
Defined once, shared across all modules:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` | UUID primary key |
| `projectId` | `String` | FK → Project |
| `unitNumber` | `String` | Unique per project |
| `price` | `Decimal` | Base price |
| `status` | `UnitStatus` | Defaults to `AVAILABLE` |
| `siteVisits` | `SiteVisit[]` | Relation |
| `quotations` | `Quotation[]` | Relation |
| `bookings` | `Booking[]` | Relation |
| `createdAt` | `DateTime` | Auto-managed |

Unique constraint: `@@unique([projectId, unitNumber])`

`UnitStatus` enum: `AVAILABLE | RESERVED | SOLD` (already defined in the schema, not redeclared here).

---

### 9.2 API Endpoints

#### Project Endpoints

| Method | Path | Roles | Request Body | Response |
|--------|------|-------|--------------|----------|
| `POST` | `/api/projects` | ADMIN, MANAGER | `{ name, location?, status? }` | `{ project }` |
| `GET` | `/api/projects` | ADMIN, MANAGER, SALES_EXECUTIVE | Query: `status?, search?, page?, pageSize?` | `{ items: Project[], total, page, pageSize }` |
| `GET` | `/api/projects/:id` | ADMIN, MANAGER, SALES_EXECUTIVE | — | `{ project }` with unit count summary |
| `PUT` | `/api/projects/:id` | ADMIN, MANAGER | `{ name?, location?, status? }` | `{ project }` |

#### Unit Endpoints

| Method | Path | Roles | Request Body | Response |
|--------|------|-------|--------------|----------|
| `POST` | `/api/units` | ADMIN, MANAGER | `{ projectId, unitNumber, price }` | `{ unit }` |
| `GET` | `/api/units` | ADMIN, MANAGER, SALES_EXECUTIVE | Query: `projectId?, status?` | `{ items: Unit[] }` |
| `GET` | `/api/units/:id` | ADMIN, MANAGER, SALES_EXECUTIVE | — | `{ unit }` with project details |
| `PUT` | `/api/units/:id` | ADMIN, MANAGER | `{ unitNumber?, price? }` | `{ unit }` |
| `PATCH` | `/api/units/:id/status` | ADMIN, MANAGER | `{ status }` | `{ unit }` |

All responses follow the standard envelope:
```json
{ "success": true, "message": "...", "data": { } }
```

**Notes:**
- `PATCH /api/units/:id/status` is for manual status changes (`AVAILABLE` ↔ `SOLD`) only. It does not set `RESERVED` — that transition is handled exclusively inside the Booking module's confirmation transaction.
- Attempting to create a unit with a duplicate `unitNumber` within the same project returns a clear validation error, not a database-level crash.

---

### 9.3 Backend Files

| File | Purpose |
|------|---------|
| `src/routes/projectRoutes.js` | Project route definitions, role guards |
| `src/controllers/projectController.js` | Project CRUD logic via Prisma |
| `src/routes/unitRoutes.js` | Unit route definitions, role guards |
| `src/controllers/unitController.js` | Unit CRUD and status management via Prisma |

Middleware reused: `authMiddleware.js` (authentication + role authorization), `errorMiddleware.js` (centralized error handling). No new middleware required.

All routes mounted in `src/routes/index.js`.

---

### 9.4 Frontend Files

| File | Purpose |
|------|---------|
| `src/pages/Project/ProjectPage.jsx` | Project list with search and status filter |
| `src/pages/Project/ProjectForm.jsx` | Create and edit a project |
| `src/pages/Project/ProjectDetailPage.jsx` | Project details with its unit inventory table |
| `src/pages/Unit/UnitForm.jsx` | Add or edit a unit within a project |
| `src/services/projectService.js` | Axios calls for all project endpoints |
| `src/services/unitService.js` | Axios calls for all unit endpoints |

Shared components reused (no new components required): `StatusBadge.jsx`, `UnitAvailabilityList.jsx`, and existing `Table`, `Modal`, `Input`, and `Form` primitives.

Route entries added to `AppRoutes.jsx` with matching role guards. Sidebar navigation entry added for Projects.

---

### 9.5 Acceptance Checklist

- [ ] Migration applied — `Project` model extended with `status` and `updatedAt`; `ProjectStatus` enum added; `Unit` table created with `@@unique([projectId, unitNumber])`
- [ ] All routes mounted in `routes/index.js` and protected with role guards
- [ ] All API responses follow `{ success, message, data }` envelope consistently
- [ ] Duplicate `unitNumber` within the same project returns a validation error, not a 500
- [ ] Project and Unit pages built exclusively from existing shared components — no one-off styled markup
- [ ] Routes registered in `AppRoutes.jsx` with correct role guards; sidebar nav entry present for Projects
- [ ] Smoke test:
  - Create a project → confirm it appears in the project list
  - Add two units with prices → confirm both appear under the project
  - Attempt to add a duplicate unit number in the same project → confirm rejection with a clear message
  - Call `GET /api/units?status=AVAILABLE` → confirm both units are returned
  - Manually set one unit to `SOLD` via `PATCH /api/units/:id/status` → confirm it no longer appears in `AVAILABLE` results
  - Create an Inquiry linked to the project → confirm it succeeds
  - Confirm `UnitAvailabilityList` shows only the remaining `AVAILABLE` unit
