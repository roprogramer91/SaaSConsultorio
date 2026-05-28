import bcrypt from 'bcrypt';
import prisma from '../prisma/client.js';
import { authenticateUser } from '../services/authService.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  maxAge: 12 * 60 * 60 * 1000
};

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y password son obligatorios' });
    }

    const session = await authenticateUser({ email, password });

    if (!session) {
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    res.cookie('authToken', session.token, cookieOptions);

    return res.json({
      message: 'Login correcto',
      token: session.token,
      user: session.user
    });
  } catch (error) {
    return next(error);
  }
}

export function me(req, res) {
  return res.json({ user: req.auth.user, doctor: req.auth.doctor, consulorioId: req.auth.consulorioId });
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword y newPassword son obligatorios' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.auth.user.id } });
    const matches = await bcrypt.compare(currentPassword, user.password);

    if (!matches) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: false }
    });

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    return next(error);
  }
}

export function logout(req, res) {
  res.clearCookie('authToken', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  });

  return res.json({ message: 'Sesion cerrada' });
}
