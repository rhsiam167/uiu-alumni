import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handleCreateDonation, handleExportDonationsCsv, handleGetDonations, handleGetDonationsSummary } from './controller.js';
import { createDonationSchema } from './schemas.js';

const router = Router();

router.get('/summary', asyncHandler(handleGetDonationsSummary));
router.get('/', requireAuth, asyncHandler(handleGetDonations));
router.post('/', requireAuth, validate(createDonationSchema), asyncHandler(handleCreateDonation));

export default router;
