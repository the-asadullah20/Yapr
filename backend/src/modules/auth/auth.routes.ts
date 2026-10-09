import { Router } from 'express';
import { authController } from './auth.controller.js';
import { otpLimiter } from '../../middleware/rateLimiter.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/otp/request', otpLimiter, (req, res, next) => authController.requestOtp(req, res, next));
router.post('/otp/verify', (req, res, next) => authController.verifyOtp(req, res, next));
router.get('/me', requireAuth, (req, res, next) => authController.getMe(req, res, next));

export const authRoutes = router;
