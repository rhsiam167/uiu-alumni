import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { errorHandler } from './middleware/errorHandler.js';
import { originCheck } from './middleware/originCheck.js';
import { generalLimiter } from './middleware/rateLimits.js';
import adminRoutes from './modules/admin/routes.js';
import authRoutes from './modules/auth/routes.js';
import chatRoutes from './modules/chat/routes.js';
import donationRoutes from './modules/donations/routes.js';
import { handleExportRegistrationsCsv, handleGetRegistrationsAdmin } from './modules/events/controller.js';
import eventRoutes from './modules/events/routes.js';
import jobRoutes from './modules/jobs/routes.js';
import mentorshipRoutes from './modules/mentorship/routes.js';
import userRoutes from './modules/users/routes.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { asyncHandler } from './utils/asyncHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Helmet with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      frameAncestors: ["'none'"]
    }
  }
}));

// CORS
app.use(cors({
  origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map(s => s.trim()) : env.APP_BASE_URL,
  credentials: true
}));

// Parsers & logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  res.status(200).json({ status: 'ok', db: 'up' });
}));

// Static frontend serving
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// API Router
const apiRouter = express.Router();

apiRouter.use(originCheck);
apiRouter.use(generalLimiter);

apiRouter.get('/health', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  res.status(200).json({ status: 'ok', db: 'up' });
}));

// Mount modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/mentorship', mentorshipRoutes);
apiRouter.use('/jobs', jobRoutes);
apiRouter.use('/events', eventRoutes);
apiRouter.use('/donations', donationRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/admin', adminRoutes);

// Admin Event Registrations endpoints
apiRouter.get('/admin/events/:id/registrations.csv', requireAuth, requireRole('admin'), asyncHandler(handleExportRegistrationsCsv));
apiRouter.get('/admin/events/:id/registrations', requireAuth, requireRole('admin'), asyncHandler(handleGetRegistrationsAdmin));

// Unknown /api routes return 404
apiRouter.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
      details: []
    }
  });
});

app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
