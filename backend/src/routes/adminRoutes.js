import { Router } from 'express';
import {
  createDoctor,
  createMatricula,
  createService,
  editDoctor,
  editService,
  getDoctors,
  reactivateDoctor,
  removeDoctor,
  removeMatricula,
  removeService
} from '../controllers/adminDoctorController.js';
import { requireAdminRole, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

const guard = [requireAuth, requireAdminRole];

router.get('/admin/doctors', ...guard, getDoctors);
router.post('/admin/doctors', ...guard, createDoctor);
router.put('/admin/doctors/:doctorId', ...guard, editDoctor);
router.delete('/admin/doctors/:doctorId', ...guard, removeDoctor);
router.patch('/admin/doctors/:doctorId/activate', ...guard, reactivateDoctor);

router.post('/admin/doctors/:doctorId/services', ...guard, createService);
router.put('/admin/doctors/:doctorId/services/:serviceId', ...guard, editService);
router.delete('/admin/doctors/:doctorId/services/:serviceId', ...guard, removeService);

router.post('/admin/doctors/:doctorId/matriculas', ...guard, createMatricula);
router.delete('/admin/doctors/:doctorId/matriculas/:matriculaId', ...guard, removeMatricula);

export default router;
