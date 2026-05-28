import { Router } from 'express';
import {
  createMyAvailability,
  deleteMyAvailability,
  getMyAvailability,
  updateMyAvailability
} from '../controllers/availabilityController.js';
import { requireAuth, requireDoctorRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/me/availability', requireAuth, requireDoctorRole, getMyAvailability);
router.post('/me/availability', requireAuth, requireDoctorRole, createMyAvailability);
router.put('/me/availability/:id', requireAuth, requireDoctorRole, updateMyAvailability);
router.delete('/me/availability/:id', requireAuth, requireDoctorRole, deleteMyAvailability);

export default router;
