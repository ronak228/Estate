const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { VALID_INTERACTION_TYPES } = require('../utils/constants');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTACT_SELECT = {
  id: true,
  companyId: true,
  fullName: true,
  phone: true,
  email: true,
  company_name: true,
  address: true,
  budgetMin: true,
  budgetMax: true,
  preferredArea: true,
  createdAt: true,
  updatedAt: true,
};

// ─── POST /api/contacts ───────────────────────────────────────────────────────

const createContact = async (req, res, next) => {
  try {
    const {
      fullName, phone, email, company_name, address,
      budgetMin, budgetMax, preferredArea,
    } = req.body;
    const companyId = req.user.companyId;

    if (!fullName || !fullName.trim()) return sendError(res, 'fullName is required', 400);
    if (!phone || !phone.trim()) return sendError(res, 'phone is required', 400);

    if (budgetMin != null && (isNaN(parseInt(budgetMin)) || parseInt(budgetMin) < 0)) {
      return sendError(res, 'budgetMin must be a non-negative integer', 400);
    }
    if (budgetMax != null && (isNaN(parseInt(budgetMax)) || parseInt(budgetMax) < 0)) {
      return sendError(res, 'budgetMax must be a non-negative integer', 400);
    }

    const contact = await db.contact.create({
      data: {
        companyId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        company_name: company_name?.trim() || null,
        address: address?.trim() || null,
        budgetMin: budgetMin != null ? parseInt(budgetMin) : null,
        budgetMax: budgetMax != null ? parseInt(budgetMax) : null,
        preferredArea: preferredArea?.trim() || null,
      },
      select: CONTACT_SELECT,
    });

    return sendSuccess(res, 'Contact created', { contact }, 201);
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 'A contact with this phone number already exists', 409);
    }
    next(err);
  }
};

// ─── GET /api/contacts ────────────────────────────────────────────────────────

const listContacts = async (req, res, next) => {
  try {
    const { search } = req.query;
    const companyId = req.user.companyId;
    const { page, pageSize, skip, take } = getPagination(req.query);

    const where = { companyId };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      db.contact.count({ where }),
      db.contact.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          ...CONTACT_SELECT,
          _count: { select: { inquiries: true, interactions: true } },
        },
      }),
    ]);

    return sendSuccess(res, 'Contacts retrieved', {
      items,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/contacts/:id ────────────────────────────────────────────────────

const getContact = async (req, res, next) => {
  try {
    const contact = await db.contact.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: {
        inquiries: {
          orderBy: { createdAt: 'desc' },
          include: {
            project: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, fullName: true } },
          },
        },
        interactions: {
          orderBy: { occurredAt: 'desc' },
          take: 10,
          include: {
            createdBy: { select: { id: true, fullName: true } },
            inquiry: { select: { id: true, stage: true } },
          },
        },
      },
    });

    if (!contact) return sendError(res, 'Contact not found', 404);

    return sendSuccess(res, 'Contact retrieved', { contact });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/contacts/:id ────────────────────────────────────────────────────

const updateContact = async (req, res, next) => {
  try {
    const { fullName, phone, email, company_name, address, budgetMin, budgetMax, preferredArea } =
      req.body;
    const companyId = req.user.companyId;

    const existing = await db.contact.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) return sendError(res, 'Contact not found', 404);

    // If phone is changing, check uniqueness within company
    if (phone && phone.trim() !== existing.phone) {
      const conflict = await db.contact.findFirst({
        where: {
          companyId,
          phone: phone.trim(),
          NOT: { id: req.params.id },
        },
      });
      if (conflict) return sendError(res, 'A contact with this phone number already exists', 409);
    }

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (company_name !== undefined) updateData.company_name = company_name?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;

    // BUG-026: validate numeric budget fields properly (must be non-negative integers)
    if (budgetMin !== undefined) {
      if (budgetMin !== null && budgetMin !== '') {
        const bMin = Number(budgetMin);
        if (!Number.isInteger(bMin) || bMin < 0) {
          return sendError(res, 'budgetMin must be a non-negative integer', 400);
        }
        updateData.budgetMin = bMin;
      } else {
        updateData.budgetMin = null;
      }
    }
    if (budgetMax !== undefined) {
      if (budgetMax !== null && budgetMax !== '') {
        const bMax = Number(budgetMax);
        if (!Number.isInteger(bMax) || bMax < 0) {
          return sendError(res, 'budgetMax must be a non-negative integer', 400);
        }
        updateData.budgetMax = bMax;
      } else {
        updateData.budgetMax = null;
      }
    }

    if (preferredArea !== undefined) updateData.preferredArea = preferredArea?.trim() || null;

    const contact = await db.contact.update({
      where: { id: req.params.id },
      data: updateData,
      select: CONTACT_SELECT,
    });

    return sendSuccess(res, 'Contact updated', { contact });
  } catch (err) {
    // BUG-026: catch the race-condition P2002 from the DB unique constraint
    if (err.code === 'P2002') {
      return sendError(res, 'A contact with this phone number already exists', 409);
    }
    next(err);
  }
};

// ─── POST /api/contacts/:id/interactions ─────────────────────────────────────

const createInteraction = async (req, res, next) => {
  try {
    const { inquiryId, type, notes, occurredAt } = req.body;
    const companyId = req.user.companyId;

    if (!type) return sendError(res, 'type is required', 400);
    if (!notes || !notes.trim()) return sendError(res, 'notes is required', 400);

    if (!VALID_INTERACTION_TYPES.includes(type)) {
      return sendError(res, `type must be one of: ${VALID_INTERACTION_TYPES.join(', ')}`, 400);
    }

    const contact = await db.contact.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!contact) return sendError(res, 'Contact not found', 404);

    // Verify inquiry belongs to this company and contact (if provided)
    if (inquiryId) {
      const inquiry = await db.inquiry.findFirst({
        where: { id: inquiryId, companyId, contactId: req.params.id },
      });
      if (!inquiry) return sendError(res, 'Inquiry not found or not linked to this contact', 400);
    }

    const occurredDate = occurredAt ? new Date(occurredAt) : new Date();
    if (occurredAt && isNaN(occurredDate.getTime())) {
      return sendError(res, 'occurredAt must be a valid date', 400);
    }

    const interaction = await db.$transaction(async (tx) => {
      const created = await tx.interaction.create({
        data: {
          contactId: req.params.id,
          inquiryId: inquiryId || null,
          type,
          notes: notes.trim(),
          occurredAt: occurredDate,
          createdById: req.user.id,
        },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          inquiry: { select: { id: true, stage: true } },
        },
      });

      // Write ActivityLog on the linked inquiry if provided
      if (inquiryId) {
        await tx.activityLog.create({
          data: {
            inquiryId,
            type: 'INTERACTION_LOGGED',
            description: `Interaction logged: ${type} — ${notes.trim().substring(0, 60)}${notes.trim().length > 60 ? '…' : ''}`,
            performedById: req.user.id,
          },
        });
      }

      return created;
    });

    return sendSuccess(res, 'Interaction logged', { interaction }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/contacts/:id/interactions ──────────────────────────────────────

const listInteractions = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { page, pageSize, skip, take } = getPagination(req.query);

    const contact = await db.contact.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!contact) return sendError(res, 'Contact not found', 404);

    const [total, items] = await Promise.all([
      db.interaction.count({ where: { contactId: req.params.id } }),
      db.interaction.findMany({
        where: { contactId: req.params.id },
        skip,
        take,
        orderBy: { occurredAt: 'desc' },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          inquiry: { select: { id: true, stage: true } },
        },
      }),
    ]);

    return sendSuccess(res, 'Interactions retrieved', {
      items,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createContact,
  listContacts,
  getContact,
  updateContact,
  createInteraction,
  listInteractions,
};
