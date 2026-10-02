import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handleCreateMentorshipRequest, handleDeleteMentorship, handleGetMentorshipRequests, handleUpdateMentorshipStatus } from './controller.js';
import { createMentorshipRequestSchema, deleteMentorshipSchema, updateMentorshipStatusSchema } from './schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/requests', asyncHandler(handleGetMentorshipRequests));
router.post('/requests', validate(createMentorshipRequestSchema), asyncHandler(handleCreateMentorshipRequest));
router.put('/requests/:id', validate(updateMentorshipStatusSchema), asyncHandler(handleUpdateMentorshipStatus));
router.delete('/requests/:id', validate(deleteMentorshipSchema), asyncHandler(handleDeleteMentorship));

export default router;
