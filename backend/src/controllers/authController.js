const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * POST /api/auth/login
 * Public — authenticates email/password, returns JWT + user info.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { company: { select: { id: true, name: true, status: true } } },
    });

    // Generic message — never reveal which part was wrong
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Block login for suspended company users
    if (user.role !== 'SUPER_ADMIN' && user.company?.status === 'SUSPENDED') {
      return sendError(res, 'Company account is suspended. Please contact your administrator.', 403);
    }

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, companyId: user.companyId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Update lastLoginAt
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return sendSuccess(res, 'Login successful', {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Any authenticated — returns current user info.
 */
const getMe = async (req, res, next) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        companyId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        company: {
          select: { id: true, name: true, timezone: true, currency: true, logoUrl: true },
        },
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, 'User retrieved', { user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/change-password
 * Any authenticated — requires current password before setting new one.
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'currentPassword and newPassword are required', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters', 400);
    }

    const user = await db.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return sendError(res, 'Current password is incorrect', 400);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash },
    });

    return sendSuccess(res, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Any authenticated — client-side token discard; endpoint exists for symmetry/auditing.
 *
 * BUG-034 (known limitation, Phase 1): JWT tokens are stateless and have no
 * server-side revocation. A stolen/leaked token remains valid until its 8h expiry.
 * When production hardening is required, replace this with a token denylist
 * (e.g., Redis-backed) or switch to short-lived tokens + refresh-token rotation.
 */
const logout = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, changePassword, logout };
