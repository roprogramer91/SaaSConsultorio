import { createAppointment } from '../services/appointmentService.js';

export async function createAppointmentHandler(req, res, next) {
  try {
    const { doctorId, consulorioId, serviceId, name, email, phone, dateTime } = req.body;

    if (!doctorId || !consulorioId || !name || !email || !phone || !dateTime) {
      return res.status(400).json({
        message: 'doctorId, consulorioId, name, email, phone y dateTime son obligatorios'
      });
    }

    const appointment = await createAppointment({ doctorId, consulorioId, serviceId, name, email, phone, dateTime });

    return res.status(201).json({
      message: 'Turno reservado correctamente',
      appointment: {
        id: appointment.id,
        dateTime: appointment.dateTime,
        status: appointment.status,
        patient: appointment.patient,
        doctor: {
          id: appointment.doctor.id,
          name: appointment.doctor.user.name,
          slug: appointment.doctor.slug,
          specialty: appointment.doctor.specialty
        },
        service: appointment.service
      }
    });
  } catch (error) {
    return next(error);
  }
}
