import { Router } from 'express';
import { optionalAuth, requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handleCreateEvent, handleDeleteEvent, handleExportRegistrationsCsv, handleGetAllEvents, handleGetEventById, handleGetRegistrationsAdmin, handleRegisterEvent, handleUnregisterEvent, handleUpdateEvent } from './controller.js';
import { createEventSchema, updateEventSchema } from './schemas.js';

const router = Router();

router.get('/', optionalAuth, asyncHandler(handleGetAllEvents));
router.get('/:id', optionalAuth, asyncHandler(handleGetEventById));

// Admin routes
router.post('/', requireAuth, requireRole('admin'), validate(createEventSchema), asyncHandler(handleCreateEvent));
router.put('/:id', requireAuth, requireRole('admin'), validate(updateEventSchema), asyncHandler(handleUpdateEvent));
router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(handleDeleteEvent));

// Registrations
router.get('/:id/registrations', requireAuth, requireRole('admin'), asyncHandler(handleGetRegistrationsAdmin));
router.get('/:id/registrations.csv', requireAuth, requireRole('admin'), asyncHandler(handleExportRegistrationsCsv));
router.post('/:id/register', requireAuth, asyncHandler(handleRegisterEvent));
router.delete('/:id/register', requireAuth, asyncHandler(handleUnregisterEvent));

export default router;
