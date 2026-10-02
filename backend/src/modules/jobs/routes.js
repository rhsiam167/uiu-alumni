import { Router } from 'express';
import { optionalAuth, requireAuth, requireRole } from '../../middleware/auth.js';
import { uploadCvMiddleware, validateCvFile } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handleApplyJob, handleCreateJob, handleDeleteJob, handleGetJobById, handleGetMyApplications, handleGetMyJobs, handleGetPublicJobs, handleUpdateJob } from './controller.js';
import { applyJobSchema, createJobSchema, updateJobSchema } from './schemas.js';

const router = Router();

router.get('/', optionalAuth, asyncHandler(handleGetPublicJobs));
router.get('/mine', requireAuth, requireRole('alumni'), asyncHandler(handleGetMyJobs));
router.get('/applications/mine', requireAuth, asyncHandler(handleGetMyApplications));
router.get('/:id', optionalAuth, asyncHandler(handleGetJobById));

router.post('/', requireAuth, requireRole('alumni'), validate(createJobSchema), asyncHandler(handleCreateJob));
router.put('/:id', requireAuth, requireRole('alumni'), validate(updateJobSchema), asyncHandler(handleUpdateJob));
router.delete('/:id', requireAuth, asyncHandler(handleDeleteJob));

router.post('/:id/apply', requireAuth, uploadCvMiddleware, validateCvFile, validate(applyJobSchema), asyncHandler(handleApplyJob));

export default router;
