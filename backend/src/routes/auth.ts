import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Wszystkie endpointy auth objęte surowszym rate limitingiem
router.use(authLimiter);

// Publiczne
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Chronione
router.get('/me', authenticate, authController.me);
router.post('/register', authenticate, requireRole('ADMIN'), authController.register);

export default router;
