import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimits.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handleChangePassword, handleGetMe, handleLogin, handleLogout, handleRegister } from './controller.js';
import { changePasswordSchema, loginSchema, registerSchema } from './schemas.js';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), asyncHandler(handleRegister));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(handleLogin));
router.post('/logout', asyncHandler(handleLogout));
router.get('/me', requireAuth, asyncHandler(handleGetMe));
router.put('/password', requireAuth, validate(changePasswordSchema), asyncHandler(handleChangePassword));

export default router;
