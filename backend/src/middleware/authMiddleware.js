const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendError } = require('../utils/response');

/**
 * Verify JWT and load live User row.
 * Sets req.user = { id, companyId, role, isActive }
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return sendError(res, 'Invalid or expired token', 401);
    }

    // Load live user row to catch deactivation since token issuance
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        companyId: true,
        role: true,
        isActive: true,
        company: {
          select: { status: true },
        },
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account is deactivated', 401);
    }

    // Check if company is suspended (only for non-SUPER_ADMIN)
    if (user.role !== 'SUPER_ADMIN' && user.company?.status === 'SUSPENDED') {
      return sendError(res, 'Company account is suspended', 403);
    }

    req.user = {
      id: user.id,
      companyId: user.companyId,
      role: user.role,
      isActive: user.isActive,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('ADMIN', 'MANAGER')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Forbidden: insufficient permissions', 403);
    }

    next();
  };
};

module.exports = { authenticate, authorize };
