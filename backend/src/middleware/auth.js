import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      throw new ApiError(401, 'NOT_AUTHENTICATED', 'Authentication cookie missing');
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      throw new ApiError(401, 'NOT_AUTHENTICATED', 'Invalid or expired token');
    }

    // Fresh lookup from DB on every request
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.userId]);
    const user = rows[0];

    if (!user) {
      throw new ApiError(401, 'NOT_AUTHENTICATED', 'User no longer exists');
    }

    if (user.status !== 'approved') {
      if (user.status === 'pending') {
        throw new ApiError(403, 'ACCOUNT_PENDING', 'Your account is pending admin approval');
      } else if (user.status === 'rejected') {
        throw new ApiError(403, 'ACCOUNT_REJECTED', 'Your account application was rejected', [
          { field: 'status', message: user.rejection_reason || 'No reason provided' }
        ]);
      } else if (user.status === 'suspended') {
        throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');
      }
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      req.user = null;
      return next();
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      req.user = null;
      return next();
    }

    const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.userId]);
    const user = rows[0];

    if (user && user.status === 'approved') {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'NOT_AUTHENTICATED', 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', `Action requires one of roles: ${roles.join(', ')}`));
    }
    next();
  };
}
