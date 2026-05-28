import { Router } from 'express';
import { changePassword, login, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);
router.post('/auth/logout', requireAuth, logout);
router.post('/auth/change-password', requireAuth, changePassword);

export default router;
