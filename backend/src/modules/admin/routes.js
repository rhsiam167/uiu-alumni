import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handleExportDonationsCsv } from '../donations/controller.js';
import { handleDeleteAdminUser, handleGetAdminJobs, handleGetAdminStats, handleGetAdminUserById, handleGetAdminUsers, handleUpdateAdminJob, handleUpdateAdminUser } from './controller.js';
import { adminDeleteUserSchema, adminUpdateJobSchema, adminUpdateUserSchema } from './schemas.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/stats', asyncHandler(handleGetAdminStats));
router.get('/users', asyncHandler(handleGetAdminUsers));
router.get('/users/:id', asyncHandler(handleGetAdminUserById));
router.put('/users/:id', validate(adminUpdateUserSchema), asyncHandler(handleUpdateAdminUser));
router.delete('/users/:id', validate(adminDeleteUserSchema), asyncHandler(handleDeleteAdminUser));

router.get('/jobs', asyncHandler(handleGetAdminJobs));
router.put('/jobs/:id', validate(adminUpdateJobSchema), asyncHandler(handleUpdateAdminJob));

router.get('/donations.csv', asyncHandler(handleExportDonationsCsv));

export default router;
