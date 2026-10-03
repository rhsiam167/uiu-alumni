import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function originCheck(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = [env.APP_BASE_URL];
    if (env.CORS_ORIGIN) {
      env.CORS_ORIGIN.split(',').forEach(o => allowedOrigins.push(o.trim()));
    }

    if (env.NODE_ENV !== 'production') {
      const portMatch = env.APP_BASE_URL ? env.APP_BASE_URL.match(/:(\d+)$/) : null;
      const port = portMatch ? portMatch[1] : '5000';
      allowedOrigins.push(`http://localhost:${port}`);
      allowedOrigins.push(`http://127.0.0.1:${port}`);
    }

    if (!allowedOrigins.includes(origin)) {
      return next(new ApiError(403, 'FORBIDDEN_ORIGIN', 'Origin header not permitted'));
    }
  }

  // Require Content-Type on write routes if body is present
  const contentLength = req.headers['content-length'];
  const hasBody = contentLength && Number(contentLength) > 0;
  const contentType = req.headers['content-type'] || '';

  if (hasBody && !contentType.includes('application/json') && !contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
    return next(new ApiError(400, 'INVALID_CONTENT_TYPE', 'Content-Type must be application/json or multipart/form-data'));
  }

  next();
}
