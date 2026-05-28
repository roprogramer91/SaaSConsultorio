import { Router } from 'express';
import {
  getDoctorAppointments,
  getDoctorAvailability,
  getDoctorBySlug
} from '../controllers/doctorController.js';
import { requireAuth, requireDoctorRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/doctors/:slug', getDoctorBySlug);
router.get('/doctors/:slug/availability', getDoctorAvailability);
router.get('/doctors/:doctorId/appointments', requireAuth, requireDoctorRole, getDoctorAppointments);

export default router;
