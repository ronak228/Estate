const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');

const VALID_STATUSES = ['UPCOMING', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'COMPLETED'];

// ─── POST /api/projects ───────────────────────────────────────────────────────

const createProject = async (req, res, next) => {
  try {
    const { name, location, status } = req.body;
    const companyId = req.user.companyId;

    if (!name || !name.trim()) return sendError(res, 'name is required', 400);

    if (status && !VALID_STATUSES.includes(status)) {
      return sendError(res, `status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const project = await db.project.create({
      data: {
        companyId,
        name: name.trim(),
        location: location?.trim() || null,
        status: status || 'UPCOMING',
      },
    });

    return sendSuccess(res, 'Project created', { project }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/projects ────────────────────────────────────────────────────────

const listProjects = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const companyId = req.user.companyId;
    const { page, pageSize, skip, take } = getPagination(req.query);

    if (status && !VALID_STATUSES.includes(status)) {
      return sendError(res, `status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const where = { companyId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      db.project.count({ where }),
      db.project.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { units: true } },
        },
      }),
    ]);

    return sendSuccess(res, 'Projects retrieved', {
      items,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/projects/:id ────────────────────────────────────────────────────

const getProject = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const project = await db.project.findFirst({
      where: { id: req.params.id, companyId },
      include: {
        units: {
          orderBy: { unitNumber: 'asc' },
        },
        _count: {
          select: {
            units: true,
            inquiries: true,
          },
        },
      },
    });

    if (!project) return sendError(res, 'Project not found', 404);

    // Unit summary breakdown
    const unitSummary = {
      total: project._count.units,
      available: project.units.filter((u) => u.status === 'AVAILABLE').length,
      reserved: project.units.filter((u) => u.status === 'RESERVED').length,
      sold: project.units.filter((u) => u.status === 'SOLD').length,
    };

    return sendSuccess(res, 'Project retrieved', { project, unitSummary });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/projects/:id ────────────────────────────────────────────────────

const updateProject = async (req, res, next) => {
  try {
    const { name, location, status } = req.body;
    const companyId = req.user.companyId;

    const existing = await db.project.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) return sendError(res, 'Project not found', 404);

    if (name !== undefined && !name.trim()) {
      return sendError(res, 'name cannot be empty', 400);
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return sendError(res, `status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (status !== undefined) updateData.status = status;

    const project = await db.project.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return sendSuccess(res, 'Project updated', { project });
  } catch (err) {
    next(err);
  }
};

module.exports = { createProject, listProjects, getProject, updateProject };
