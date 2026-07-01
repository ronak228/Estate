const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');

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

// ─── GET /api/contacts ────────────────────────────────────────────────────────

const listContacts = async (req, res, next) => {
  try {
    const { search, page = 1, pageSize = 20 } = req.query;
    const companyId = req.user.companyId;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

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
        take: parseInt(pageSize),
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
      page: parseInt(page),
      pageSize: parseInt(pageSize),
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
    if (budgetMin !== undefined) updateData.budgetMin = budgetMin ? parseInt(budgetMin) : null;
    if (budgetMax !== undefined) updateData.budgetMax = budgetMax ? parseInt(budgetMax) : null;
    if (preferredArea !== undefined) updateData.preferredArea = preferredArea?.trim() || null;

    const contact = await db.contact.update({
      where: { id: req.params.id },
      data: updateData,
      select: CONTACT_SELECT,
    });

    return sendSuccess(res, 'Contact updated', { contact });
  } catch (err) {
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

    const VALID_TYPES = ['CALL', 'MEETING', 'WHATSAPP', 'EMAIL', 'NOTE'];
    if (!VALID_TYPES.includes(type)) {
      return sendError(res, `type must be one of: ${VALID_TYPES.join(', ')}`, 400);
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
            type: 'NOTE_ADDED',
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
    const { page = 1, pageSize = 20 } = req.query;
    const companyId = req.user.companyId;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const contact = await db.contact.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!contact) return sendError(res, 'Contact not found', 404);

    const [total, items] = await Promise.all([
      db.interaction.count({ where: { contactId: req.params.id } }),
      db.interaction.findMany({
        where: { contactId: req.params.id },
        skip,
        take: parseInt(pageSize),
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
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listContacts,
  getContact,
  updateContact,
  createInteraction,
  listInteractions,
};
