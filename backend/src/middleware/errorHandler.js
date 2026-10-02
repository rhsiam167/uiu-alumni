import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || [];

  // Handle Postgres errors
  if (err.code === '23505') { // unique violation
    statusCode = 409;
    code = 'CONFLICT';
    message = err.detail || 'A resource with these details already exists';
  } else if (err.code === '23514') { // check violation
    statusCode = 400;
    code = 'CHECK_VIOLATION';
    message = err.detail || 'Constraint check failed';
  } else if (err.code === '23503') { // foreign key violation
    statusCode = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    message = 'Referenced entity does not exist';
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Input validation failed';
    details = err.errors.map(e => {
      const cleanPath = e.path.filter(p => p !== 'body' && p !== 'query' && p !== 'params').join('.');
      return {
        field: cleanPath || e.path.join('.'),
        message: e.message
      };
    });
  }

  if (statusCode === 500 && env.NODE_ENV !== 'development') {
    message = 'An unexpected server error occurred';
  }

  if (env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('SERVER ERROR Stack:', err.stack);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details
    }
  });
}
