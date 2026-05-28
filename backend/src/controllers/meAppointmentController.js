import prisma from '../prisma/client.js';
import {
  findDoctorAppointmentById,
  getRescheduleOptionsForDoctor,
  rescheduleAppointment
} from '../services/appointmentService.js';

const allowedStatuses = ['booked', 'cancelled', 'completed'];

function appointmentSelect() {
  return {
    id: true,
    doctorId: true,
    patientId: true,
    consulorioId: true,
    dateTime: true,
    status: true,
    createdAt: true,
    patient: {
      select: { id: true, name: true, email: true, phone: true, createdAt: true }
    },
    service: {
      select: { id: true, name: true, duration: true, price: true }
    }
  };
}

async function getOwnedAppointmentOrResponse(req, res, appointmentId, actionText) {
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    res.status(404).json({ message: 'Turno no encontrado' });
    return null;
  }

  const appointment = await findDoctorAppointmentById(appointmentId);

  if (!appointment) {
    res.status(404).json({ message: 'Turno no encontrado' });
    return null;
  }

  if (appointment.doctorId !== req.auth.doctor.id) {
    res.status(403).json({ message: `No puedes ${actionText} un turno de otro doctor` });
    return null;
  }

  return appointment;
}

export async function getMyAppointments(req, res, next) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: req.auth.doctor.id, consulorioId: req.auth.consulorioId },
      select: appointmentSelect(),
      orderBy: { dateTime: 'asc' }
    });

    return res.json({ appointments });
  } catch (error) {
    return next(error);
  }
}

export async function getMyAppointmentById(req, res, next) {
  try {
    const appointmentId = Number(req.params.id);
    const appointment = await getOwnedAppointmentOrResponse(req, res, appointmentId, 'ver');

    if (!appointment) {
      return;
    }

    return res.json({ appointment });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyAppointmentStatus(req, res, next) {
  try {
    const appointmentId = Number(req.params.id);
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'El estado enviado no es valido' });
    }

    const appointment = await getOwnedAppointmentOrResponse(req, res, appointmentId, 'actualizar');

    if (!appointment) {
      return;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
      select: appointmentSelect()
    });

    return res.json({
      message: 'Estado del turno actualizado correctamente',
      appointment: updatedAppointment
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyAppointmentRescheduleOptions(req, res, next) {
  try {
    const appointmentId = Number(req.params.id);
    const appointment = await getOwnedAppointmentOrResponse(req, res, appointmentId, 'ver');

    if (!appointment) {
      return;
    }

    if (appointment.status !== 'booked') {
      return res.status(400).json({ message: 'Solo se pueden reprogramar turnos con estado booked' });
    }

    const slots = await getRescheduleOptionsForDoctor(req.auth.doctor.id, req.auth.consulorioId, appointment.id);
    const filteredSlots = slots.filter((slot) => slot.dateTime !== new Date(appointment.dateTime).toISOString());

    return res.json({
      appointmentId: appointment.id,
      currentDateTime: appointment.dateTime,
      slots: filteredSlots
    });
  } catch (error) {
    return next(error);
  }
}

export async function rescheduleMyAppointment(req, res, next) {
  try {
    const appointmentId = Number(req.params.id);
    const appointment = await getOwnedAppointmentOrResponse(req, res, appointmentId, 'reprogramar');

    if (!appointment) {
      return;
    }

    const { newDateTime } = req.body;

    if (!newDateTime) {
      return res.status(400).json({ message: 'newDateTime es obligatorio' });
    }

    try {
      const updatedAppointment = await rescheduleAppointment({ appointmentId, newDateTime });

      return res.json({
        message: 'Turno reprogramado correctamente',
        appointment: updatedAppointment
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      throw error;
    }
  } catch (error) {
    return next(error);
  }
}
