const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { VALID_INQUIRY_SOURCES, VALID_INQUIRY_STAGES } = require('../utils/constants');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Standard include block for a full Inquiry fetch.
 */
const INQUIRY_INCLUDE = {
  contact: true,
  project: true,
  broker: true,
  assignedTo: { select: { id: true, fullName: true, email: true, role: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
};

/**
 * Resolve or create a Contact within the same company.
 * If newContact is provided, look up by phone first — create only if no match.
 * Returns the contact id.
 */
async function resolveContact(tx, companyId, contactId, newContact) {
  if (contactId) return contactId;

  if (!newContact || !newContact.fullName || !newContact.phone) {
    throw Object.assign(new Error('contactId or newContact (fullName + phone) is required'), {
      statusCode: 400,
    });
  }

  const existing = await tx.contact.findUnique({
    where: { companyId_phone: { companyId, phone: newContact.phone.trim() } },
  });

  if (existing) return existing.id;

  const created = await tx.contact.create({
    data: {
      companyId,
      fullName: newContact.fullName.trim(),
      phone: newContact.phone.trim(),
      email: newContact.email?.trim() || null,
      company_name: newContact.company_name?.trim() || null,
      address: newContact.address?.trim() || null,
      budgetMin: newContact.budgetMin != null ? parseInt(newContact.budgetMin) : null,
      budgetMax: newContact.budgetMax != null ? parseInt(newContact.budgetMax) : null,
      preferredArea: newContact.preferredArea?.trim() || null,
    },
  });

  return created.id;
}

// ─── POST /api/inquiries ──────────────────────────────────────────────────────

const createInquiry = async (req, res, next) => {
  try {
    const { contactId, newContact, projectId, brokerId, assignedToId, source, notes } = req.body;
    const companyId = req.user.companyId;

    if (!assignedToId) return sendError(res, 'assignedToId is required', 400);
    if (!source) return sendError(res, 'source is required', 400);

    const VALID_SOURCES = VALID_INQUIRY_SOURCES;
    if (!VALID_SOURCES.includes(source)) {
      return sendError(res, `source must be one of: ${VALID_SOURCES.join(', ')}`, 400);
    }

    // Assignment authority (BUG-009): assigning an inquiry to another user is a
    // manager-only action (see PATCH /:id/assign). A SALES_EXECUTIVE may only
    // self-assign at creation, so force the assignee to themselves regardless of
    // the requested assignedToId. ADMIN/MANAGER may assign to anyone.
    const effectiveAssignedToId =
      req.user.role === 'SALES_EXECUTIVE' ? req.user.id : assignedToId;

    // Verify assignedTo belongs to same company
    const assignee = await db.user.findFirst({
      where: { id: effectiveAssignedToId, companyId, isActive: true },
    });
    if (!assignee) return sendError(res, 'assignedToId is not a valid active user in your company', 400);

    // Verify project belongs to same company (if provided)
    if (projectId) {
      const project = await db.project.findFirst({ where: { id: projectId, companyId } });
      if (!project) return sendError(res, 'Project not found in your company', 400);
    }

    // Verify broker belongs to same company (if provided)
    if (brokerId) {
      const broker = await db.broker.findFirst({ where: { id: brokerId, companyId } });
      if (!broker) return sendError(res, 'Broker not found in your company', 400);
    }

    const inquiry = await db.$transaction(async (tx) => {
      const resolvedContactId = await resolveContact(tx, companyId, contactId, newContact);

      const created = await tx.inquiry.create({
        data: {
          companyId,
          contactId: resolvedContactId,
          projectId: projectId || null,
          brokerId: brokerId || null,
          assignedToId: effectiveAssignedToId,
          createdById: req.user.id,
          source,
          notes: notes?.trim() || null,
        },
        include: INQUIRY_INCLUDE,
      });

      await tx.activityLog.create({
        data: {
          inquiryId: created.id,
          type: 'CREATED',
          description: `Inquiry created by ${req.user.id === effectiveAssignedToId ? 'and assigned to self' : `and assigned to ${assignee.fullName}`}`,
          performedById: req.user.id,
        },
      });

      return created;
    });

    return sendSuccess(res, 'Inquiry created successfully', { inquiry }, 201);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

// ─── GET /api/inquiries ───────────────────────────────────────────────────────

const listInquiries = async (req, res, next) => {
  try {
    const { stage, source, assignedToId, search } = req.query;
    const companyId = req.user.companyId;
    const { page, pageSize, skip, take } = getPagination(req.query);

    const where = { companyId };

    if (stage) where.stage = stage;
    if (source) where.source = source;
    if (assignedToId) where.assignedToId = assignedToId;

    if (search) {
      where.OR = [
        { contact: { fullName: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search, mode: 'insensitive' } } },
        { contact: { email: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      db.inquiry.count({ where }),
      db.inquiry.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: INQUIRY_INCLUDE,
      }),
    ]);

    return sendSuccess(res, 'Inquiries retrieved', {
      items,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/inquiries/:id ───────────────────────────────────────────────────

const getInquiry = async (req, res, next) => {
  try {
    const inquiry = await db.inquiry.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: {
        ...INQUIRY_INCLUDE,
        followUps: {
          orderBy: { scheduledAt: 'asc' },
          include: {
            createdBy: { select: { id: true, fullName: true } },
          },
        },
        activities: {
          orderBy: { createdAt: 'asc' },
          include: {
            performedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    return sendSuccess(res, 'Inquiry retrieved', { inquiry });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/inquiries/:id ───────────────────────────────────────────────────

const updateInquiry = async (req, res, next) => {
  try {
    const { projectId, brokerId, source, notes } = req.body;
    const companyId = req.user.companyId;

    const existing = await db.inquiry.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) return sendError(res, 'Inquiry not found', 404);

    if (source && !VALID_INQUIRY_SOURCES.includes(source)) {
      return sendError(res, `source must be one of: ${VALID_INQUIRY_SOURCES.join(', ')}`, 400);
    }

    if (projectId) {
      const project = await db.project.findFirst({ where: { id: projectId, companyId } });
      if (!project) return sendError(res, 'Project not found in your company', 400);
    }

    if (brokerId) {
      const broker = await db.broker.findFirst({ where: { id: brokerId, companyId } });
      if (!broker) return sendError(res, 'Broker not found in your company', 400);
    }

    const updateData = {};
    if (source !== undefined) updateData.source = source;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (brokerId !== undefined) updateData.brokerId = brokerId || null;

    const inquiry = await db.$transaction(async (tx) => {
      const updated = await tx.inquiry.update({
        where: { id: req.params.id },
        data: updateData,
        include: INQUIRY_INCLUDE,
      });

      await tx.activityLog.create({
        data: {
          inquiryId: updated.id,
          type: 'INQUIRY_UPDATED',
          description: 'Inquiry details updated',
          performedById: req.user.id,
        },
      });

      return updated;
    });

    return sendSuccess(res, 'Inquiry updated', { inquiry });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/inquiries/:id/assign ─────────────────────────────────────────

const assignInquiry = async (req, res, next) => {
  try {
    const { assignedToId } = req.body;
    const companyId = req.user.companyId;

    if (!assignedToId) return sendError(res, 'assignedToId is required', 400);

    const existing = await db.inquiry.findFirst({
      where: { id: req.params.id, companyId },
      select: { id: true, assignedToId: true },
    });
    if (!existing) return sendError(res, 'Inquiry not found', 404);

    const assignee = await db.user.findFirst({
      where: { id: assignedToId, companyId, isActive: true },
    });
    if (!assignee) return sendError(res, 'assignedToId is not a valid active user in your company', 400);

    const isReassign = existing.assignedToId !== assignedToId;

    const inquiry = await db.$transaction(async (tx) => {
      const updated = await tx.inquiry.update({
        where: { id: req.params.id },
        data: { assignedToId },
        include: INQUIRY_INCLUDE,
      });

      await tx.activityLog.create({
        data: {
          inquiryId: updated.id,
          type: isReassign ? 'REASSIGNED' : 'ASSIGNED',
          description: isReassign
            ? `Inquiry reassigned to ${assignee.fullName}`
            : `Inquiry assigned to ${assignee.fullName}`,
          performedById: req.user.id,
        },
      });

      return updated;
    });

    return sendSuccess(res, 'Inquiry assigned', { inquiry });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/inquiries/:id/stage ──────────────────────────────────────────

// Allowed manual stage transitions (BUG-016). BOOKED is intentionally NOT a
// valid manual target — it is reached only through the booking flow. Transitions
// out of BOOKED are also disallowed here (managed by booking cancellation).
const STAGE_TRANSITIONS = {
  NEW: ['CONTACTED', 'QUALIFIED', 'NOT_INTERESTED'],
  CONTACTED: ['QUALIFIED', 'SITE_VISIT_SCHEDULED', 'NOT_INTERESTED'],
  QUALIFIED: ['CONTACTED', 'SITE_VISIT_SCHEDULED', 'NEGOTIATION', 'NOT_INTERESTED'],
  SITE_VISIT_SCHEDULED: ['QUALIFIED', 'NEGOTIATION', 'NOT_INTERESTED'],
  NEGOTIATION: ['SITE_VISIT_SCHEDULED', 'NOT_INTERESTED'],
  BOOKED: [], // managed by booking / cancellation flows only
  NOT_INTERESTED: ['NEW', 'CONTACTED'], // allow reopening a lost lead
};

const changeStage = async (req, res, next) => {
  try {
    const { stage } = req.body;
    const companyId = req.user.companyId;

    if (!VALID_INQUIRY_STAGES.includes(stage)) {
      return sendError(res, `stage must be one of: ${VALID_INQUIRY_STAGES.join(', ')}`, 400);
    }

    const existing = await db.inquiry.findFirst({
      where: { id: req.params.id, companyId },
      select: { id: true, stage: true },
    });
    if (!existing) return sendError(res, 'Inquiry not found', 404);

    // BOOKED can never be set manually — it is driven by the booking flow.
    if (stage === 'BOOKED') {
      return sendError(res, 'Stage BOOKED is set automatically by the booking flow and cannot be assigned manually', 400);
    }

    // BUG-024: QUALIFIED has a dedicated endpoint (qualifyInquiry) which has
    // richer notes support and an already-qualified guard — route through it.
    if (stage === 'QUALIFIED') {
      return qualifyInquiry(req, res, next);
    }

    // Enforce the transition state machine.
    if (existing.stage === stage) {
      return sendError(res, `Inquiry is already in stage ${stage}`, 400);
    }
    const allowed = STAGE_TRANSITIONS[existing.stage] || [];
    if (!allowed.includes(stage)) {
      return sendError(
        res,
        `Invalid stage transition from ${existing.stage} to ${stage}`,
        400
      );
    }

    const inquiry = await db.$transaction(async (tx) => {
      const updated = await tx.inquiry.update({
        where: { id: req.params.id },
        data: { stage },
        include: INQUIRY_INCLUDE,
      });

      const activityType = stage === 'NOT_INTERESTED' ? 'MARKED_NOT_INTERESTED' : 'STAGE_CHANGED';

      await tx.activityLog.create({
        data: {
          inquiryId: updated.id,
          type: activityType,
          description:
            stage === 'NOT_INTERESTED'
              ? 'Inquiry marked as Not Interested'
              : `Stage changed from ${existing.stage} to ${stage}`,
          performedById: req.user.id,
        },
      });

      return updated;
    });

    return sendSuccess(res, 'Stage updated', { inquiry });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/inquiries/:id/follow-ups ──────────────────────────────────────

const createFollowUp = async (req, res, next) => {
  try {
    const { scheduledAt, notes } = req.body;
    const companyId = req.user.companyId;

    if (!scheduledAt) return sendError(res, 'scheduledAt is required', 400);

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return sendError(res, 'scheduledAt must be a valid date', 400);
    }

    const inquiry = await db.inquiry.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    const followUp = await db.$transaction(async (tx) => {
      const created = await tx.followUp.create({
        data: {
          inquiryId: req.params.id,
          scheduledAt: scheduledDate,
          notes: notes?.trim() || null,
          createdById: req.user.id,
        },
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          inquiryId: req.params.id,
          type: 'FOLLOW_UP_SCHEDULED',
          description: `Follow-up scheduled for ${scheduledDate.toLocaleDateString('en-IN')}`,
          performedById: req.user.id,
        },
      });

      return created;
    });

    return sendSuccess(res, 'Follow-up scheduled', { followUp }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/inquiries/:id/follow-ups/:followUpId ─────────────────────────

const updateFollowUp = async (req, res, next) => {
  try {
    const { completedAt, notes } = req.body;
    const companyId = req.user.companyId;

    // Verify inquiry belongs to this company
    const inquiry = await db.inquiry.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    const existing = await db.followUp.findFirst({
      where: { id: req.params.followUpId, inquiryId: req.params.id },
    });
    if (!existing) return sendError(res, 'Follow-up not found', 404);

    const updateData = {};
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (completedAt !== undefined) {
      const completedDate = completedAt ? new Date(completedAt) : null;
      if (completedAt && isNaN(completedDate.getTime())) {
        return sendError(res, 'completedAt must be a valid date', 400);
      }
      updateData.completedAt = completedDate;
    }

    const wasAlreadyCompleted = !!existing.completedAt;
    const isNowCompleting = completedAt && !wasAlreadyCompleted;

    const followUp = await db.$transaction(async (tx) => {
      const updated = await tx.followUp.update({
        where: { id: req.params.followUpId },
        data: updateData,
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      if (isNowCompleting) {
        await tx.activityLog.create({
          data: {
            inquiryId: req.params.id,
            type: 'FOLLOW_UP_COMPLETED',
            description: `Follow-up completed`,
            performedById: req.user.id,
          },
        });
      }

      return updated;
    });

    return sendSuccess(res, 'Follow-up updated', { followUp });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/inquiries/:id/activities ───────────────────────────────────────

const getActivities = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const inquiry = await db.inquiry.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    const items = await db.activityLog.findMany({
      where: { inquiryId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        performedBy: { select: { id: true, fullName: true } },
      },
    });

    return sendSuccess(res, 'Activities retrieved', { items });
  } catch (err) {
    next(err);
  }
};

// ─── Reference data helpers ───────────────────────────────────────────────────

/** GET /api/inquiries/meta/users — active users for assignment dropdown */
const getAssignableUsers = async (req, res, next) => {
  try {
    const users = await db.user.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true,
        role: { in: ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'] },
      },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: 'asc' },
    });

    return sendSuccess(res, 'Users retrieved', { users });
  } catch (err) {
    next(err);
  }
};

/** GET /api/inquiries/meta/projects — projects for project dropdown */
const getProjects = async (req, res, next) => {
  try {
    const projects = await db.project.findMany({
      where: { companyId: req.user.companyId },
      select: { id: true, name: true, location: true },
      orderBy: { name: 'asc' },
    });

    return sendSuccess(res, 'Projects retrieved', { projects });
  } catch (err) {
    next(err);
  }
};

/** GET /api/inquiries/meta/brokers — brokers for broker dropdown */
const getBrokers = async (req, res, next) => {
  try {
    const brokers = await db.broker.findMany({
      where: { companyId: req.user.companyId },
      select: { id: true, name: true, phone: true, company_name: true },
      orderBy: { name: 'asc' },
    });

    return sendSuccess(res, 'Brokers retrieved', { brokers });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/inquiries/:id/qualify ────────────────────────────────────────

const qualifyInquiry = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const companyId = req.user.companyId;

    const existing = await db.inquiry.findFirst({
      where: { id: req.params.id, companyId },
      select: { id: true, stage: true },
    });
    if (!existing) return sendError(res, 'Inquiry not found', 404);

    if (existing.stage === 'QUALIFIED') {
      return sendError(res, 'Inquiry is already qualified', 400);
    }

    const inquiry = await db.$transaction(async (tx) => {
      const updated = await tx.inquiry.update({
        where: { id: req.params.id },
        data: { stage: 'QUALIFIED' },
        include: INQUIRY_INCLUDE,
      });

      await tx.activityLog.create({
        data: {
          inquiryId: updated.id,
          type: 'INQUIRY_QUALIFIED',
          description: notes?.trim()
            ? `Inquiry qualified — ${notes.trim()}`
            : `Stage changed from ${existing.stage} to QUALIFIED`,
          performedById: req.user.id,
        },
      });

      return updated;
    });

    return sendSuccess(res, 'Inquiry qualified', { inquiry });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createInquiry,
  listInquiries,
  getInquiry,
  updateInquiry,
  assignInquiry,
  changeStage,
  qualifyInquiry,
  createFollowUp,
  updateFollowUp,
  getActivities,
  getAssignableUsers,
  getProjects,
  getBrokers,
};
