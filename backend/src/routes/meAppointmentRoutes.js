import { Router } from 'express';
import {
  getMyAppointmentById,
  getMyAppointments,
  getMyAppointmentRescheduleOptions,
  rescheduleMyAppointment,
  updateMyAppointmentStatus
} from '../controllers/meAppointmentController.js';
import { requireAuth, requireDoctorRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/me/appointments', requireAuth, requireDoctorRole, getMyAppointments);
router.get('/me/appointments/:id', requireAuth, requireDoctorRole, getMyAppointmentById);
router.get('/me/appointments/:id/reschedule-options', requireAuth, requireDoctorRole, getMyAppointmentRescheduleOptions);
router.patch('/me/appointments/:id/reschedule', requireAuth, requireDoctorRole, rescheduleMyAppointment);
router.patch('/me/appointments/:id/status', requireAuth, requireDoctorRole, updateMyAppointmentStatus);

export default router;
