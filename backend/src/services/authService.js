import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('Falta configurar JWT_SECRET');
}

export async function authenticateUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true,
      mustChangePassword: true,
      doctor: {
        select: {
          id: true,
          slug: true,
          specialty: true,
          bio: true,
          consultorios: {
            where: { active: true },
            select: { consulorioId: true, consultorio: { select: { id: true, name: true, slug: true } } },
            orderBy: { createdAt: 'asc' }
          }
        }
      },
      memberships: {
        select: { consulorioId: true, role: true, consultorio: { select: { id: true, name: true, slug: true } } },
        orderBy: { id: 'asc' }
      }
    }
  });

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return null;
  }

  let consulorioId = null;
  let consultorios = [];

  if (user.role === 'doctor' && user.doctor) {
    consultorios = user.doctor.consultorios.map((dc) => dc.consultorio);
    consulorioId = consultorios[0]?.id ?? null;
  } else if (user.memberships.length > 0) {
    consultorios = user.memberships.map((m) => m.consultorio);
    consulorioId = consultorios[0]?.id ?? null;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, consulorioId },
    jwtSecret,
    { expiresIn: '12h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      consulorioId,
      consultorios,
      ...(user.doctor
        ? { doctor: { id: user.doctor.id, slug: user.doctor.slug, specialty: user.doctor.specialty } }
        : {})
    }
  };
}

export function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}
