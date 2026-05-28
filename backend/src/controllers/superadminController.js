import {
  createConsultorio,
  listConsultorios,
  updateConsultorioPlan
} from '../services/superadminService.js';

export async function getConsultorios(req, res, next) {
  try {
    const consultorios = await listConsultorios();
    return res.json({ consultorios });
  } catch (error) {
    return next(error);
  }
}

export async function postConsultorio(req, res, next) {
  try {
    const { name, slug, adminName, adminEmail, plan } = req.body;

    if (!name || !slug || !adminName || !adminEmail) {
      return res.status(400).json({ message: 'name, slug, adminName y adminEmail son obligatorios' });
    }

    const { consultorio, tempPassword } = await createConsultorio({ name, slug, adminName, adminEmail, plan });

    return res.status(201).json({
      message: 'Consultorio creado correctamente',
      consultorio,
      tempPassword
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

export async function patchConsultorioPlan(req, res, next) {
  try {
    const consulorioId = Number(req.params.consulorioId);
    const { plan, months } = req.body;

    if (!['trial', 'basic', 'pro'].includes(plan)) {
      return res.status(400).json({ message: 'Plan invalido. Opciones: trial, basic, pro' });
    }

    const consultorio = await updateConsultorioPlan({ consulorioId, plan, months });
    return res.json({ message: 'Plan actualizado', consultorio });
  } catch (error) {
    return next(error);
  }
}
