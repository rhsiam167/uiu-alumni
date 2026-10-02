import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { chatLimiter } from '../../middleware/rateLimits.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handleClearConversation, handleGetConversations, handleGetMessages, handleSendMessage, handleUnsendMessage } from './controller.js';
import { deleteMessageSchema, getMessagesSchema, sendMessageSchema } from './schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/conversations', asyncHandler(handleGetConversations));
router.get('/conversations/:userId/messages', validate(getMessagesSchema), asyncHandler(handleGetMessages));
router.post('/conversations/:userId/messages', chatLimiter, validate(sendMessageSchema), asyncHandler(handleSendMessage));
router.delete('/conversations/:userId', asyncHandler(handleClearConversation));
router.delete('/messages/:id', validate(deleteMessageSchema), asyncHandler(handleUnsendMessage));

export default router;
