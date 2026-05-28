import prisma from '../prisma/client.js';
import { verifyToken } from '../services/authService.js';

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, entry) => {
    const [rawKey, ...rawValue] = entry.trim().split('=');

    if (!rawKey) {
      return cookies;
    }

    cookies[rawKey] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies.authToken;
}

export async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ message: 'Debes iniciar sesion' });
    }

    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.userId) },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'Sesion invalida' });
    }

    req.auth = {
      user,
      consulorioId: Number(payload.consulorioId),
      doctor: null
    };

    if (user.role === 'doctor') {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: user.id },
        select: { id: true, slug: true, specialty: true, bio: true }
      });

      req.auth.doctor = doctor;
    }

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Sesion invalida o vencida' });
  }
}

export function requireDoctorRole(req, res, next) {
  if (req.auth?.user?.role !== 'doctor' || !req.auth.doctor) {
    return res.status(403).json({ message: 'Acceso restringido a doctores' });
  }

  return next();
}

export function requireAdminRole(req, res, next) {
  if (!['admin'].includes(req.auth?.user?.role)) {
    return res.status(403).json({ message: 'Acceso restringido a administradores' });
  }

  return next();
}

export function requireDashboardPageAuth(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.redirect('/login');
  }

  try {
    verifyToken(token);
    return next();
  } catch (error) {
    return res.redirect('/login');
  }
}
