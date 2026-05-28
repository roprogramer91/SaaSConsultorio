import prisma from '../prisma/client.js';
import { buildAvailableSlots, slotFitsAvailability } from './availabilityService.js';

export async function findDoctorAppointmentById(appointmentId) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        select: { id: true, name: true, email: true, phone: true, createdAt: true }
      },
      doctor: {
        select: {
          id: true,
          slug: true,
          specialty: true,
          user: { select: { name: true, email: true } }
        }
      },
      service: { select: { id: true, name: true, duration: true, price: true } }
    }
  });
}

export async function getRescheduleOptionsForDoctor(doctorId, consulorioId, ignoredAppointmentId = null) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      availabilities: {
        where: { consulorioId }
      },
      appointments: {
        where: {
          consulorioId,
          status: 'booked',
          ...(ignoredAppointmentId ? { id: { not: ignoredAppointmentId } } : {}),
          dateTime: { gte: new Date() }
        },
        select: { id: true, dateTime: true, status: true }
      }
    }
  });

  if (!doctor) {
    return [];
  }

  return buildAvailableSlots(doctor.availabilities, doctor.appointments);
}

export async function rescheduleAppointment({ appointmentId, newDateTime }) {
  const appointment = await findDoctorAppointmentById(appointmentId);

  if (!appointment) {
    const error = new Error('Turno no encontrado');
    error.statusCode = 404;
    throw error;
  }

  if (appointment.status !== 'booked') {
    const error = new Error('Solo se pueden reprogramar turnos con estado booked');
    error.statusCode = 400;
    throw error;
  }

  const slotDate = new Date(newDateTime);

  if (Number.isNaN(slotDate.getTime()) || slotDate <= new Date()) {
    const error = new Error('El nuevo horario no es valido');
    error.statusCode = 400;
    throw error;
  }

  const availabilities = await prisma.availability.findMany({
    where: { doctorId: appointment.doctorId, consulorioId: appointment.consulorioId }
  });

  if (!slotFitsAvailability(availabilities, slotDate)) {
    const error = new Error('El nuevo horario esta fuera de la disponibilidad del doctor');
    error.statusCode = 400;
    throw error;
  }

  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      doctorId: appointment.doctorId,
      id: { not: appointment.id },
      dateTime: slotDate,
      status: 'booked'
    }
  });

  if (conflictingAppointment) {
    const error = new Error('El nuevo horario ya esta ocupado');
    error.statusCode = 400;
    throw error;
  }

  return prisma.appointment.update({
    where: { id: appointment.id },
    data: { dateTime: slotDate },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      service: { select: { id: true, name: true, duration: true, price: true } }
    }
  });
}

export async function createAppointment({ doctorId, consulorioId, serviceId, name, email, phone, dateTime }) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: Number(doctorId) },
    include: {
      availabilities: {
        where: { consulorioId: Number(consulorioId) }
      }
    }
  });

  if (!doctor) {
    const error = new Error('Doctor no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const slotDate = new Date(dateTime);

  if (Number.isNaN(slotDate.getTime()) || slotDate <= new Date()) {
    const error = new Error('La fecha del turno no es valida');
    error.statusCode = 400;
    throw error;
  }

  if (!slotFitsAvailability(doctor.availabilities, slotDate)) {
    const error = new Error('El horario seleccionado no esta disponible');
    error.statusCode = 400;
    throw error;
  }

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      doctorId_dateTime: {
        doctorId: doctor.id,
        dateTime: slotDate
      }
    }
  });

  if (existingAppointment?.status === 'booked') {
    const error = new Error('El horario ya fue reservado');
    error.statusCode = 409;
    throw error;
  }

  const patient = await prisma.patient.upsert({
    where: { consulorioId_email: { consulorioId: Number(consulorioId), email } },
    update: { name, phone },
    create: { consulorioId: Number(consulorioId), name, email, phone }
  });

  return prisma.appointment.create({
    data: {
      doctorId: doctor.id,
      patientId: patient.id,
      consulorioId: Number(consulorioId),
      ...(serviceId ? { serviceId: Number(serviceId) } : {}),
      dateTime: slotDate,
      status: 'booked'
    },
    include: {
      patient: true,
      doctor: {
        select: {
          id: true,
          slug: true,
          specialty: true,
          user: { select: { name: true } }
        }
      },
      service: { select: { id: true, name: true, duration: true, price: true } }
    }
  });
}
