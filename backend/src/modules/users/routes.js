import { Router } from 'express';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handleGetMentors, handleGetStats, handleGetUserById, handleUpdateUser } from './controller.js';
import { getMentorsSchema, updateUserSchema } from './schemas.js';

const router = Router();

router.get('/stats', asyncHandler(handleGetStats));
router.get('/mentors', validate(getMentorsSchema), asyncHandler(handleGetMentors));
router.get('/:id', optionalAuth, asyncHandler(handleGetUserById));
router.put('/:id', requireAuth, validate(updateUserSchema), asyncHandler(handleUpdateUser));

export default router;
