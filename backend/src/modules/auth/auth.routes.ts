import { Router } from 'express';
import { authController } from './auth.controller.js';
import { otpLimiter, authLimiter } from '../../middleware/rateLimiter.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/otp/request', otpLimiter, (req, res, next) => authController.requestOtp(req, res, next));
router.post('/otp/verify', authLimiter, (req, res, next) => authController.verifyOtp(req, res, next));
router.post('/register', authLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/login', authLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/forgot-password', otpLimiter, (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', authLimiter, (req, res, next) => authController.resetPassword(req, res, next));
router.post('/change-password', requireAuth, (req, res, next) => authController.changePassword(req, res, next));
router.get('/me', requireAuth, (req, res, next) => authController.getMe(req, res, next));
router.post('/oauth-sync', requireAuth, (req, res, next) => authController.oauthSync(req, res, next));
router.post('/deactivate', requireAuth, authLimiter, (req, res, next) => authController.deactivateAccount(req, res, next));
router.post('/delete-account', requireAuth, authLimiter, (req, res, next) => authController.deleteAccount(req, res, next));

export const authRoutes = router;
