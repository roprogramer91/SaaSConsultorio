import { Router } from 'express';
import { createAppointmentHandler } from '../controllers/appointmentController.js';

const router = Router();

router.post('/appointments', createAppointmentHandler);

export default router;
