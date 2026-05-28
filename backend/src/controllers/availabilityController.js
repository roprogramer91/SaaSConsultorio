import prisma from '../prisma/client.js';
import {
  hasExactDuplicate,
  hasOverlappingBlock,
  sortAvailabilities,
  validateAvailabilityInput
} from '../services/availabilityService.js';

function normalizeAvailabilityPayload(body) {
  return {
    dayOfWeek: Number(body.dayOfWeek),
    startTime: body.startTime,
    endTime: body.endTime,
    slotDuration: Number(body.slotDuration)
  };
}

async function loadDoctorAvailabilities(doctorId, consulorioId) {
  return prisma.availability.findMany({
    where: { doctorId, consulorioId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });
}

export async function getMyAvailability(req, res, next) {
  try {
    const availabilities = await loadDoctorAvailabilities(req.auth.doctor.id, req.auth.consulorioId);
    return res.json({ availabilities: sortAvailabilities(availabilities) });
  } catch (error) {
    return next(error);
  }
}

export async function createMyAvailability(req, res, next) {
  try {
    const payload = normalizeAvailabilityPayload(req.body);
    const validationError = validateAvailabilityInput(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const currentAvailabilities = await loadDoctorAvailabilities(req.auth.doctor.id, req.auth.consulorioId);

    if (hasExactDuplicate(currentAvailabilities, payload)) {
      return res.status(409).json({ message: 'Ya existe un bloque identico de disponibilidad' });
    }

    if (hasOverlappingBlock(currentAvailabilities, payload)) {
      return res.status(409).json({ message: 'El bloque se solapa con otra disponibilidad del mismo dia' });
    }

    const availability = await prisma.availability.create({
      data: {
        doctorId: req.auth.doctor.id,
        consulorioId: req.auth.consulorioId,
        ...payload
      }
    });

    return res.status(201).json({
      message: 'Disponibilidad creada correctamente',
      availability
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyAvailability(req, res, next) {
  try {
    const availabilityId = Number(req.params.id);
    const payload = normalizeAvailabilityPayload(req.body);
    const validationError = validateAvailabilityInput(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const availability = await prisma.availability.findFirst({
      where: {
        id: availabilityId,
        doctorId: req.auth.doctor.id,
        consulorioId: req.auth.consulorioId
      }
    });

    if (!availability) {
      return res.status(404).json({ message: 'Bloque de disponibilidad no encontrado' });
    }

    const currentAvailabilities = await loadDoctorAvailabilities(req.auth.doctor.id, req.auth.consulorioId);

    if (hasExactDuplicate(currentAvailabilities, payload, availabilityId)) {
      return res.status(409).json({ message: 'Ya existe un bloque identico de disponibilidad' });
    }

    if (hasOverlappingBlock(currentAvailabilities, payload, availabilityId)) {
      return res.status(409).json({ message: 'El bloque se solapa con otra disponibilidad del mismo dia' });
    }

    const updatedAvailability = await prisma.availability.update({
      where: { id: availabilityId },
      data: payload
    });

    return res.json({
      message: 'Disponibilidad actualizada correctamente',
      availability: updatedAvailability
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteMyAvailability(req, res, next) {
  try {
    const availabilityId = Number(req.params.id);
    const availability = await prisma.availability.findFirst({
      where: {
        id: availabilityId,
        doctorId: req.auth.doctor.id,
        consulorioId: req.auth.consulorioId
      }
    });

    if (!availability) {
      return res.status(404).json({ message: 'Bloque de disponibilidad no encontrado' });
    }

    await prisma.availability.delete({ where: { id: availabilityId } });

    return res.json({ message: 'Disponibilidad eliminada correctamente' });
  } catch (error) {
    return next(error);
  }
}
