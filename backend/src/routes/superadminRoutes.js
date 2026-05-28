import { Router } from 'express';
import {
  getConsultorios,
  patchConsultorioPlan,
  postConsultorio
} from '../controllers/superadminController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

function requireSuperadmin(req, res, next) {
  if (req.auth?.user?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Acceso restringido a superadmin' });
  }
  return next();
}

const guard = [requireAuth, requireSuperadmin];

router.get('/superadmin/consultorios', ...guard, getConsultorios);
router.post('/superadmin/consultorios', ...guard, postConsultorio);
router.patch('/superadmin/consultorios/:consulorioId/plan', ...guard, patchConsultorioPlan);

export default router;
