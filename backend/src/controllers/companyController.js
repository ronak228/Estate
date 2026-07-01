const bcrypt = require('bcryptjs');
const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const slugify = require('../utils/slugify');

// ─── SUPER_ADMIN: Company CRUD ────────────────────────────────────────────────

/**
 * POST /api/companies
 * SUPER_ADMIN — creates a Company + first ADMIN user in one transaction.
 */
const createCompany = async (req, res, next) => {
  try {
    const { name, email, phone, address, timezone, currency, admin } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, 'Company name is required', 400);
    }
    if (!admin || !admin.fullName || !admin.email || !admin.password) {
      return sendError(res, 'Admin fullName, email, and password are required', 400);
    }
    if (admin.password.length < 6) {
      return sendError(res, 'Admin password must be at least 6 characters', 400);
    }

    const baseSlug = slugify(name);

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await db.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Check admin email uniqueness
    const existingUser = await db.user.findUnique({
      where: { email: admin.email.toLowerCase().trim() },
    });
    if (existingUser) {
      return sendError(res, 'Admin email is already in use', 409);
    }

    const passwordHash = await bcrypt.hash(admin.password, 10);

    const result = await db.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: name.trim(),
          slug,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          timezone: timezone || 'Asia/Kolkata',
          currency: currency || 'INR',
        },
      });

      const adminUser = await tx.user.create({
        data: {
          companyId: company.id,
          fullName: admin.fullName.trim(),
          email: admin.email.toLowerCase().trim(),
          passwordHash,
          role: 'ADMIN',
          phone: admin.phone?.trim() || null,
        },
      });

      return { company, admin: adminUser };
    });

    return sendSuccess(
      res,
      'Company created successfully',
      {
        company: formatCompany(result.company),
        admin: formatUser(result.admin),
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/companies
 * SUPER_ADMIN — paginated list of all companies.
 */
const listCompanies = async (req, res, next) => {
  try {
    const { status, search, page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      db.company.count({ where }),
      db.company.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true } } },
      }),
    ]);

    return sendSuccess(res, 'Companies retrieved', {
      items: items.map(formatCompany),
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/companies/:id
 * SUPER_ADMIN — single company by ID.
 */
const getCompanyById = async (req, res, next) => {
  try {
    const company = await db.company.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { users: true } } },
    });

    if (!company) {
      return sendError(res, 'Company not found', 404);
    }

    return sendSuccess(res, 'Company retrieved', { company: formatCompany(company) });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/companies/:id/status
 * SUPER_ADMIN — suspend or reactivate a company.
 */
const updateCompanyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
      return sendError(res, 'status must be ACTIVE or SUSPENDED', 400);
    }

    const company = await db.company.findUnique({ where: { id: req.params.id } });
    if (!company) {
      return sendError(res, 'Company not found', 404);
    }

    const updated = await db.company.update({
      where: { id: req.params.id },
      data: { status },
    });

    return sendSuccess(res, `Company ${status === 'ACTIVE' ? 'reactivated' : 'suspended'}`, {
      company: formatCompany(updated),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/companies/:id/admin
 * SUPER_ADMIN — creates or replaces the company's ADMIN user.
 */
const setCompanyAdmin = async (req, res, next) => {
  try {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !email || !password) {
      return sendError(res, 'fullName, email, and password are required', 400);
    }
    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400);
    }

    const company = await db.company.findUnique({ where: { id: req.params.id } });
    if (!company) {
      return sendError(res, 'Company not found', 404);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check email uniqueness (exclude existing admins of this company)
    const conflicting = await db.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { companyId: req.params.id, role: 'ADMIN' },
      },
    });
    if (conflicting) {
      return sendError(res, 'Email is already in use', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert: deactivate old ADMIN, create new one in one transaction
    const adminUser = await db.$transaction(async (tx) => {
      // Deactivate existing admins for this company
      await tx.user.updateMany({
        where: { companyId: req.params.id, role: 'ADMIN' },
        data: { isActive: false },
      });

      return tx.user.create({
        data: {
          companyId: req.params.id,
          fullName: fullName.trim(),
          email: normalizedEmail,
          passwordHash,
          role: 'ADMIN',
          phone: phone?.trim() || null,
        },
      });
    });

    return sendSuccess(res, 'Company admin created', { admin: formatUser(adminUser) });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN/MANAGER: Own Company ───────────────────────────────────────────────

/**
 * GET /api/companies/me
 * ADMIN, MANAGER, SALES_EXECUTIVE — own company profile.
 */
const getMyCompany = async (req, res, next) => {
  try {
    const company = await db.company.findUnique({
      where: { id: req.user.companyId },
    });

    if (!company) {
      return sendError(res, 'Company not found', 404);
    }

    return sendSuccess(res, 'Company retrieved', { company: formatCompany(company) });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/companies/me/settings
 * ADMIN — update own company settings and branding.
 */
const updateMyCompanySettings = async (req, res, next) => {
  try {
    const { timezone, currency, primaryColor } = req.body;

    const updateData = {};
    if (timezone) updateData.timezone = timezone;
    if (currency) updateData.currency = currency;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;

    // Handle logo upload if file was provided
    if (req.file) {
      updateData.logoUrl = `/uploads/companies/${req.file.filename}`;
    }

    const company = await db.company.update({
      where: { id: req.user.companyId },
      data: updateData,
    });

    return sendSuccess(res, 'Company settings updated', { company: formatCompany(company) });
  } catch (err) {
    next(err);
  }
};

// ─── Employee Management ──────────────────────────────────────────────────────

/**
 * POST /api/companies/me/employees
 * ADMIN — create a MANAGER or SALES_EXECUTIVE for own company.
 */
const createEmployee = async (req, res, next) => {
  try {
    const { fullName, email, password, role, phone } = req.body;

    if (!fullName || !email || !password || !role) {
      return sendError(res, 'fullName, email, password, and role are required', 400);
    }
    if (!['MANAGER', 'SALES_EXECUTIVE'].includes(role)) {
      return sendError(res, 'role must be MANAGER or SALES_EXECUTIVE', 400);
    }
    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400);
    }

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return sendError(res, 'Email is already in use', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        companyId: req.user.companyId,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        phone: phone?.trim() || null,
      },
    });

    return sendSuccess(res, 'Employee created successfully', { user: formatUser(user) }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/companies/me/employees
 * ADMIN, MANAGER — list employees of own company.
 */
const listEmployees = async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = { companyId: req.user.companyId };

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
    ]);

    return sendSuccess(res, 'Employees retrieved', {
      items,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/companies/me/employees/:id
 * ADMIN — update employee profile fields.
 */
const updateEmployee = async (req, res, next) => {
  try {
    const { fullName, phone, role } = req.body;

    const employee = await db.user.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    // ADMIN cannot promote/create another ADMIN
    if (role && role === 'ADMIN') {
      return sendError(res, 'Cannot assign ADMIN role through this endpoint', 403);
    }
    if (role && !['MANAGER', 'SALES_EXECUTIVE'].includes(role)) {
      return sendError(res, 'role must be MANAGER or SALES_EXECUTIVE', 400);
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (role) updateData.role = role;

    const updated = await db.user.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return sendSuccess(res, 'Employee updated', { user: formatUser(updated) });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/companies/me/employees/:id/status
 * ADMIN — activate or deactivate an employee.
 */
const updateEmployeeStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return sendError(res, 'isActive must be a boolean', 400);
    }

    const employee = await db.user.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    // Prevent deactivating self
    if (employee.id === req.user.id) {
      return sendError(res, 'You cannot deactivate your own account', 400);
    }

    const updated = await db.user.update({
      where: { id: req.params.id },
      data: { isActive },
    });

    return sendSuccess(
      res,
      `Employee ${isActive ? 'activated' : 'deactivated'}`,
      { user: formatUser(updated) }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/companies/me/employees/:id/reset-password
 * ADMIN — reset an employee's password directly.
 */
const resetEmployeePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, 'newPassword must be at least 6 characters', 400);
    }

    const employee = await db.user.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });

    return sendSuccess(res, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCompany = (company) => {
  const { ...rest } = company;
  return rest;
};

const formatUser = (user) => {
  const { passwordHash, ...rest } = user;
  return rest;
};

module.exports = {
  createCompany,
  listCompanies,
  getCompanyById,
  updateCompanyStatus,
  setCompanyAdmin,
  getMyCompany,
  updateMyCompanySettings,
  createEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeStatus,
  resetEmployeePassword,
};
