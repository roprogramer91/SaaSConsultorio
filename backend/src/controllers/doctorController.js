import prisma from '../prisma/client.js';
import { buildAvailableSlots } from '../services/availabilityService.js';

export async function getDoctorBySlug(req, res, next) {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        slug: true,
        specialty: true,
        bio: true,
        createdAt: true,
        user: { select: { name: true, email: true } }
      }
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor no encontrado' });
    }

    return res.json({
      id: doctor.id,
      name: doctor.user.name,
      email: doctor.user.email,
      slug: doctor.slug,
      specialty: doctor.specialty,
      bio: doctor.bio,
      createdAt: doctor.createdAt
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDoctorAvailability(req, res, next) {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        slug: true,
        specialty: true,
        bio: true,
        user: { select: { name: true } },
        consultorios: {
          where: { active: true },
          select: { consulorioId: true },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor no encontrado' });
    }

    const consulorioId = doctor.consultorios[0]?.consulorioId ?? null;

    if (!consulorioId) {
      return res.json({
        doctor: { id: doctor.id, name: doctor.user.name, slug: doctor.slug, specialty: doctor.specialty, bio: doctor.bio },
        consulorioId: null,
        slots: []
      });
    }

    const availabilities = await prisma.availability.findMany({
      where: { doctorId: doctor.id, consulorioId }
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        consulorioId,
        status: 'booked',
        dateTime: { gte: new Date() }
      },
      select: { dateTime: true, status: true }
    });

    const slots = buildAvailableSlots(availabilities, appointments);

    return res.json({
      doctor: { id: doctor.id, name: doctor.user.name, slug: doctor.slug, specialty: doctor.specialty, bio: doctor.bio },
      consulorioId,
      slots
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDoctorAppointments(req, res, next) {
  try {
    const doctorId = Number(req.params.doctorId);
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        slug: true,
        specialty: true,
        user: { select: { name: true } }
      }
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor no encontrado' });
    }

    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      include: {
        patient: { select: { name: true, email: true, phone: true } },
        service: { select: { name: true, duration: true } }
      },
      orderBy: { dateTime: 'asc' }
    });

    return res.json({
      doctor: { id: doctor.id, name: doctor.user.name, slug: doctor.slug, specialty: doctor.specialty },
      appointments
    });
  } catch (error) {
    return next(error);
  }
}
