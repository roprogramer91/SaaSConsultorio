import bcrypt from 'bcrypt';
import prisma from '../prisma/client.js';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function listConsultorios() {
  return prisma.consultorio.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      members: {
        where: { role: 'admin' },
        include: { user: { select: { id: true, name: true, email: true } } }
      },
      doctorLinks: { where: { active: true } },
      _count: { select: { patients: true, appointments: true } }
    }
  });
}

export async function createConsultorio({ name, slug, adminName, adminEmail, plan }) {
  const slugExists = await prisma.consultorio.findUnique({ where: { slug } });
  if (slugExists) {
    const error = new Error('El slug ya esta en uso');
    error.statusCode = 409;
    throw error;
  }

  const emailExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (emailExists) {
    const error = new Error('Ya existe un usuario con ese email');
    error.statusCode = 409;
    throw error;
  }

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 10);

  const consultorio = await prisma.consultorio.create({
    data: {
      name,
      slug,
      plan: plan || 'trial',
      members: {
        create: {
          role: 'admin',
          user: {
            create: {
              email: adminEmail,
              password: hashed,
              name: adminName,
              role: 'admin',
              mustChangePassword: true
            }
          }
        }
      }
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    }
  });

  return { consultorio, tempPassword };
}

export async function updateConsultorioPlan({ consulorioId, plan }) {
  return prisma.consultorio.update({
    where: { id: consulorioId },
    data: { plan }
  });
}
