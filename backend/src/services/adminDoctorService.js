import bcrypt from 'bcrypt';
import prisma from '../prisma/client.js';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function listDoctors(consulorioId) {
  return prisma.doctorConsultorio.findMany({
    where: { consulorioId },
    orderBy: { createdAt: 'asc' },
    include: {
      doctor: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          services: true,
          matriculas: true
        }
      }
    }
  });
}

export async function addDoctorToConsultorio({ consulorioId, email, name, slug, specialty, bio }) {
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { doctor: true }
  });

  if (existing) {
    if (!existing.doctor) {
      const error = new Error('El usuario existe pero no tiene perfil de doctor');
      error.statusCode = 400;
      throw error;
    }

    const alreadyLinked = await prisma.doctorConsultorio.findUnique({
      where: { doctorId_consulorioId: { doctorId: existing.doctor.id, consulorioId } }
    });

    if (alreadyLinked) {
      if (alreadyLinked.active) {
        const error = new Error('El doctor ya esta activo en este consultorio');
        error.statusCode = 409;
        throw error;
      }

      const reactivated = await prisma.doctorConsultorio.update({
        where: { id: alreadyLinked.id },
        data: { active: true },
        include: { doctor: { include: { user: { select: { id: true, name: true, email: true } }, services: true, matriculas: true } } }
      });

      return { link: reactivated, tempPassword: null, isNew: false };
    }

    const link = await prisma.doctorConsultorio.create({
      data: { doctorId: existing.doctor.id, consulorioId, active: true },
      include: { doctor: { include: { user: { select: { id: true, name: true, email: true } }, services: true, matriculas: true } } }
    });

    return { link, tempPassword: null, isNew: false };
  }

  const slugExists = await prisma.doctor.findUnique({ where: { slug } });
  if (slugExists) {
    const error = new Error('El slug ya esta en uso, elegí otro');
    error.statusCode = 409;
    throw error;
  }

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: 'doctor',
      mustChangePassword: true,
      doctor: {
        create: {
          slug,
          specialty,
          bio: bio || '',
          consultorios: {
            create: { consulorioId, active: true }
          }
        }
      }
    },
    include: {
      doctor: {
        include: {
          services: true,
          matriculas: true,
          consultorios: { where: { consulorioId } }
        }
      }
    }
  });

  return { link: { doctor: { ...user.doctor, user: { id: user.id, name: user.name, email: user.email } } }, tempPassword, isNew: true };
}

export async function updateDoctor({ doctorId, consulorioId, name, slug, specialty, bio }) {
  const link = await prisma.doctorConsultorio.findUnique({
    where: { doctorId_consulorioId: { doctorId, consulorioId } }
  });

  if (!link) {
    const error = new Error('Doctor no encontrado en este consultorio');
    error.statusCode = 404;
    throw error;
  }

  if (slug) {
    const slugExists = await prisma.doctor.findFirst({ where: { slug, id: { not: doctorId } } });
    if (slugExists) {
      const error = new Error('El slug ya esta en uso');
      error.statusCode = 409;
      throw error;
    }
  }

  const [updatedDoctor] = await prisma.$transaction([
    prisma.doctor.update({
      where: { id: doctorId },
      data: {
        ...(slug && { slug }),
        ...(specialty && { specialty }),
        ...(bio !== undefined && { bio })
      }
    }),
    ...(name
      ? [prisma.user.update({
          where: { id: (await prisma.doctor.findUnique({ where: { id: doctorId }, select: { userId: true } })).userId },
          data: { name }
        })]
      : [])
  ]);

  return updatedDoctor;
}

export async function setDoctorActive({ doctorId, consulorioId, active }) {
  const link = await prisma.doctorConsultorio.findUnique({
    where: { doctorId_consulorioId: { doctorId, consulorioId } }
  });

  if (!link) {
    const error = new Error('Doctor no encontrado en este consultorio');
    error.statusCode = 404;
    throw error;
  }

  return prisma.doctorConsultorio.update({
    where: { id: link.id },
    data: { active }
  });
}

export async function addService({ doctorId, consulorioId, name, duration, price }) {
  const link = await prisma.doctorConsultorio.findUnique({
    where: { doctorId_consulorioId: { doctorId, consulorioId } }
  });

  if (!link) {
    const error = new Error('Doctor no encontrado en este consultorio');
    error.statusCode = 404;
    throw error;
  }

  return prisma.service.create({
    data: { doctorId, name, duration: Number(duration), price: price != null ? price : null }
  });
}

export async function updateService({ serviceId, doctorId, name, duration, price }) {
  const service = await prisma.service.findFirst({ where: { id: serviceId, doctorId } });

  if (!service) {
    const error = new Error('Servicio no encontrado');
    error.statusCode = 404;
    throw error;
  }

  return prisma.service.update({
    where: { id: serviceId },
    data: {
      ...(name && { name }),
      ...(duration && { duration: Number(duration) }),
      ...(price !== undefined && { price: price != null ? price : null })
    }
  });
}

export async function deleteService({ serviceId, doctorId }) {
  const service = await prisma.service.findFirst({ where: { id: serviceId, doctorId } });

  if (!service) {
    const error = new Error('Servicio no encontrado');
    error.statusCode = 404;
    throw error;
  }

  return prisma.service.delete({ where: { id: serviceId } });
}

export async function addMatricula({ doctorId, consulorioId, type, number, province }) {
  const link = await prisma.doctorConsultorio.findUnique({
    where: { doctorId_consulorioId: { doctorId, consulorioId } }
  });

  if (!link) {
    const error = new Error('Doctor no encontrado en este consultorio');
    error.statusCode = 404;
    throw error;
  }

  return prisma.doctorMatricula.create({
    data: { doctorId, type, number, province: province || null }
  });
}

export async function deleteMatricula({ matriculaId, doctorId }) {
  const matricula = await prisma.doctorMatricula.findFirst({ where: { id: matriculaId, doctorId } });

  if (!matricula) {
    const error = new Error('Matricula no encontrada');
    error.statusCode = 404;
    throw error;
  }

  return prisma.doctorMatricula.delete({ where: { id: matriculaId } });
}
