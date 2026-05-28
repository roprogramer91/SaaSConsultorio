function parseTimeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isValidTimeFormat(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function setMinutesOnDate(date, totalMinutes) {
  const nextDate = new Date(date);
  nextDate.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return nextDate;
}

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function isSameMinute(left, right) {
  return left.getTime() === right.getTime();
}

export function buildAvailableSlots(availabilities, appointments, daysAhead = 14) {
  const now = new Date();
  const bookedDates = appointments
    .filter((appointment) => appointment.status === 'booked')
    .map((appointment) => new Date(appointment.dateTime));

  const slots = [];

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const currentDay = startOfDay(new Date(now.getTime() + offset * 24 * 60 * 60 * 1000));
    const matchingAvailabilities = availabilities.filter(
      (availability) => availability.dayOfWeek === currentDay.getDay()
    );

    for (const availability of matchingAvailabilities) {
      const startMinutes = parseTimeToMinutes(availability.startTime);
      const endMinutes = parseTimeToMinutes(availability.endTime);

      for (
        let slotMinutes = startMinutes;
        slotMinutes + availability.slotDuration <= endMinutes;
        slotMinutes += availability.slotDuration
      ) {
        const slotDate = setMinutesOnDate(currentDay, slotMinutes);
        const alreadyBooked = bookedDates.some((bookedDate) => isSameMinute(bookedDate, slotDate));

        if (slotDate > now && !alreadyBooked) {
          slots.push({
            dateTime: slotDate.toISOString(),
            date: slotDate.toLocaleDateString('es-AR'),
            time: slotDate.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit'
            })
          });
        }
      }
    }
  }

  return slots;
}

export function slotFitsAvailability(availabilities, slotDate) {
  const dayAvailabilities = availabilities.filter(
    (availability) => availability.dayOfWeek === slotDate.getDay()
  );

  const slotMinutes = slotDate.getHours() * 60 + slotDate.getMinutes();

  return dayAvailabilities.some((availability) => {
    const startMinutes = parseTimeToMinutes(availability.startTime);
    const endMinutes = parseTimeToMinutes(availability.endTime);
    const duration = availability.slotDuration;

    return (
      slotMinutes >= startMinutes &&
      slotMinutes + duration <= endMinutes &&
      (slotMinutes - startMinutes) % duration === 0
    );
  });
}

export function sortAvailabilities(availabilities) {
  return [...availabilities].sort((left, right) => {
    if (left.dayOfWeek !== right.dayOfWeek) {
      return left.dayOfWeek - right.dayOfWeek;
    }

    if (left.startTime !== right.startTime) {
      return left.startTime.localeCompare(right.startTime);
    }

    return left.endTime.localeCompare(right.endTime);
  });
}

export function validateAvailabilityInput(input) {
  const { dayOfWeek, startTime, endTime, slotDuration } = input;

  if (![0, 1, 2, 3, 4, 5, 6].includes(Number(dayOfWeek))) {
    return 'dayOfWeek debe estar entre 0 y 6';
  }

  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return 'startTime y endTime deben tener formato HH:MM';
  }

  if (parseTimeToMinutes(startTime) >= parseTimeToMinutes(endTime)) {
    return 'startTime debe ser menor a endTime';
  }

  if (!Number.isInteger(Number(slotDuration)) || Number(slotDuration) <= 0) {
    return 'slotDuration debe ser un numero entero mayor a 0';
  }

  return null;
}

export function hasExactDuplicate(availabilities, candidate, ignoredId = null) {
  return availabilities.some((availability) => {
    if (ignoredId && availability.id === ignoredId) {
      return false;
    }

    return (
      availability.dayOfWeek === candidate.dayOfWeek &&
      availability.startTime === candidate.startTime &&
      availability.endTime === candidate.endTime &&
      availability.slotDuration === candidate.slotDuration
    );
  });
}

export function hasOverlappingBlock(availabilities, candidate, ignoredId = null) {
  const candidateStart = parseTimeToMinutes(candidate.startTime);
  const candidateEnd = parseTimeToMinutes(candidate.endTime);

  return availabilities.some((availability) => {
    if (availability.dayOfWeek !== candidate.dayOfWeek) {
      return false;
    }

    if (ignoredId && availability.id === ignoredId) {
      return false;
    }

    const currentStart = parseTimeToMinutes(availability.startTime);
    const currentEnd = parseTimeToMinutes(availability.endTime);

    return candidateStart < currentEnd && candidateEnd > currentStart;
  });
}
