import {
  addDoctorToConsultorio,
  addMatricula,
  addService,
  deleteMatricula,
  deleteService,
  listDoctors,
  setDoctorActive,
  updateDoctor,
  updateService
} from '../services/adminDoctorService.js';

export async function getDoctors(req, res, next) {
  try {
    const links = await listDoctors(req.auth.consulorioId);
    return res.json({ doctors: links });
  } catch (error) {
    return next(error);
  }
}

export async function createDoctor(req, res, next) {
  try {
    const { email, name, slug, specialty, bio } = req.body;

    if (!email || !name || !slug || !specialty) {
      return res.status(400).json({ message: 'email, name, slug y specialty son obligatorios' });
    }

    const result = await addDoctorToConsultorio({
      consulorioId: req.auth.consulorioId,
      email, name, slug, specialty, bio
    });

    return res.status(201).json({
      message: result.isNew
        ? 'Doctor creado y vinculado al consultorio'
        : 'Doctor vinculado al consultorio',
      doctor: result.link.doctor,
      ...(result.tempPassword ? { tempPassword: result.tempPassword } : {})
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

export async function editDoctor(req, res, next) {
  try {
    const doctorId = Number(req.params.doctorId);
    const { name, slug, specialty, bio } = req.body;

    await updateDoctor({ doctorId, consulorioId: req.auth.consulorioId, name, slug, specialty, bio });

    return res.json({ message: 'Doctor actualizado correctamente' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

export async function removeDoctor(req, res, next) {
  try {
    const doctorId = Number(req.params.doctorId);
    await setDoctorActive({ doctorId, consulorioId: req.auth.consulorioId, active: false });
    return res.json({ message: 'Doctor desactivado del consultorio' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

export async function reactivateDoctor(req, res, next) {
  try {
    const doctorId = Number(req.params.doctorId);
    await setDoctorActive({ doctorId, consulorioId: req.auth.consulorioId, active: true });
    return res.json({ message: 'Doctor reactivado en el consultorio' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

export async function createService(req, res, next) {
  try {
    const doctorId = Number(req.params.doctorId);
    const { name, duration, price } = req.body;

    if (!name || !duration) {
      return res.status(400).json({ message: 'name y duration son obligatorios' });
    }

    const service = await addService({ doctorId, consulorioId: req.auth.consulorioId, name, duration, price });
    return res.status(201).json({ message: 'Servicio agregado', service });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

export async function editService(req, res, next) {
  try {
    const doctorId = Number(req.params.doctorId);
    const serviceId = Number(req.params.serviceId);
    const { name, duration, price } = req.body;

    const service = await updateService({ serviceId, doctorId, name, duration, price });
    return res.json({ message: 'Servicio actualizado', service });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

export async function removeService(req, res, next) {
  try {
    const doctorId = Number(req.params.doctorId);
    const serviceId = Number(req.params.serviceId);

    await deleteService({ serviceId, doctorId });
    return res.json({ message: 'Servicio eliminado' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

export async function createMatricula(req, res, next) {
  try {
    const doctorId = Number(req.params.doctorId);
    const { type, number, province } = req.body;

    if (!type || !number) {
      return res.status(400).json({ message: 'type y number son obligatorios' });
    }

    const matricula = await addMatricula({ doctorId, consulorioId: req.auth.consulorioId, type, number, province });
    return res.status(201).json({ message: 'Matricula agregada', matricula });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}

export async function removeMatricula(req, res, next) {
  try {
    const doctorId = Number(req.params.doctorId);
    const matriculaId = Number(req.params.matriculaId);

    await deleteMatricula({ matriculaId, doctorId });
    return res.json({ message: 'Matricula eliminada' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
}
