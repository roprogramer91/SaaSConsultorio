const API_BASE = window.API_BASE || '';

function getToken() {
  return localStorage.getItem('authToken');
}

function saveToken(token) {
  localStorage.setItem('authToken', token);
}

function clearToken() {
  localStorage.removeItem('authToken');
}

async function getJson(url, options = {}) {
  const response = await fetch(API_BASE + url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Ocurrio un error inesperado');
  }

  return data;
}

function formatDateTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleString('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short'
  });
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.remove('hidden', 'error');

  if (isError) {
    element.classList.add('error');
  }
}

async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  return getJson(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}

async function initLoginPage() {
  const form = document.getElementById('loginForm');
  const message = document.getElementById('loginMessage');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value
    };

    try {
      const session = await getJson('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      saveToken(session.token);

      if (session.user.mustChangePassword) {
        window.location.href = '/change-password';
      } else if (session.user.role === 'superadmin') {
        window.location.href = '/dashboard-superadmin';
      } else if (session.user.role === 'admin' || session.user.role === 'secretary') {
        window.location.href = '/dashboard-admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      showMessage(message, error.message, true);
    }
  });
}

async function initDoctorPage() {
  const slug = window.location.pathname.replace(/^\//, '');
  const doctorCard = document.getElementById('doctorCard');
  const slotsContainer = document.getElementById('slots');
  const slotFeedback = document.getElementById('slotFeedback');
  const form = document.getElementById('bookingForm');
  const doctorIdInput = document.getElementById('doctorId');
  const dateTimeInput = document.getElementById('dateTime');
  const selectedSlotLabel = document.getElementById('selectedSlotLabel');
  const bookingMessage = document.getElementById('bookingMessage');
  const reloadButton = document.getElementById('reloadAvailability');

  let currentConsultorioId = null;

  async function loadDoctorAndAvailability() {
    const availability = await getJson(`/doctors/${slug}/availability`);
    const { doctor, slots, consulorioId } = availability;
    doctorIdInput.value = doctor.id;
    currentConsultorioId = consulorioId;

    doctorCard.innerHTML = `
      <p class="eyebrow">Landing publica</p>
      <h1>${doctor.name}</h1>
      <p class="lead">${doctor.specialty}</p>
      <p class="lead muted">${doctor.bio}</p>
    `;

    slotsContainer.innerHTML = '';
    slotFeedback.textContent = slots.length
      ? 'Selecciona uno de los proximos horarios disponibles.'
      : 'No hay horarios libres para los proximos 14 dias.';

    if (!slots.length) {
      slotsContainer.innerHTML = '<div class="empty-state">La agenda esta completa por ahora.</div>';
      return;
    }

    slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot-button';
      button.innerHTML = `<strong>${slot.date}</strong><span>${slot.time}</span>`;

      button.addEventListener('click', () => {
        document.querySelectorAll('.slot-button').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        dateTimeInput.value = slot.dateTime;
        selectedSlotLabel.textContent = `Turno seleccionado: ${formatDateTime(slot.dateTime)}`;
        bookingMessage.classList.add('hidden');
      });

      slotsContainer.appendChild(button);
    });
  }

  reloadButton.addEventListener('click', async () => {
    await loadDoctorAndAvailability();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!dateTimeInput.value) {
      showMessage(bookingMessage, 'Antes de reservar, elegi un horario.', true);
      return;
    }

    const payload = {
      doctorId: Number(doctorIdInput.value),
      consulorioId: currentConsultorioId,
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      dateTime: dateTimeInput.value
    };

    try {
      const result = await getJson('/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      showMessage(bookingMessage, `${result.message}. Te esperamos el ${formatDateTime(result.appointment.dateTime)}.`);
      form.reset();
      dateTimeInput.value = '';
      selectedSlotLabel.textContent = 'Todavia no seleccionaste un horario.';
      await loadDoctorAndAvailability();
    } catch (error) {
      showMessage(bookingMessage, error.message, true);
    }
  });

  try {
    await loadDoctorAndAvailability();
  } catch (error) {
    doctorCard.innerHTML = `
      <p class="eyebrow">Landing publica</p>
      <h1>No pudimos cargar este doctor</h1>
      <p class="lead muted">${error.message}</p>
    `;
  }
}

async function initDashboardPage() {
  const list = document.getElementById('appointments');
  const title = document.getElementById('dashboardTitle');
  const subtitle = document.getElementById('dashboardSubtitle');
  const logoutButton = document.getElementById('logoutButton');
  const appointmentFilters = document.getElementById('appointmentFilters');
  const appointmentDetailTitle = document.getElementById('appointmentDetailTitle');
  const appointmentDetailMeta = document.getElementById('appointmentDetailMeta');
  const appointmentDetailContent = document.getElementById('appointmentDetailContent');
  const appointmentDetailMessage = document.getElementById('appointmentDetailMessage');
  const appointmentStatusSelect = document.getElementById('appointmentStatusSelect');
  const saveAppointmentStatus = document.getElementById('saveAppointmentStatus');
  const cancelAppointmentButton = document.getElementById('cancelAppointmentButton');
  const toggleRescheduleButton = document.getElementById('toggleRescheduleButton');
  const reschedulePanel = document.getElementById('reschedulePanel');
  const rescheduleOptions = document.getElementById('rescheduleOptions');
  const confirmRescheduleButton = document.getElementById('confirmRescheduleButton');
  const cancelRescheduleButton = document.getElementById('cancelRescheduleButton');
  const availabilityList = document.getElementById('availabilityList');
  const availabilityForm = document.getElementById('availabilityForm');
  const availabilityId = document.getElementById('availabilityId');
  const availabilityMessage = document.getElementById('availabilityMessage');
  const availabilityFormTitle = document.getElementById('availabilityFormTitle');
  const cancelAvailabilityEdit = document.getElementById('cancelAvailabilityEdit');
  const availabilitySubmit = document.getElementById('availabilitySubmit');
  let dashboardSession = null;
  let currentAppointments = [];
  let currentAppointmentFilter = 'all';
  let selectedAppointmentId = null;
  let selectedRescheduleDateTime = null;

  function resetReschedulePanel(clearMessage = true) {
    selectedRescheduleDateTime = null;
    rescheduleOptions.innerHTML = '';
    reschedulePanel.classList.add('hidden');

    if (clearMessage) {
      appointmentDetailMessage.classList.add('hidden');
    }
  }

  function renderAppointmentFilters() {
    appointmentFilters.querySelectorAll('[data-filter]').forEach((button) => {
      button.classList.toggle('active-filter', button.dataset.filter === currentAppointmentFilter);
    });
  }

  function resetAppointmentDetail(clearMessage = true) {
    selectedAppointmentId = null;
    appointmentDetailTitle.textContent = 'Selecciona un turno';
    appointmentDetailMeta.textContent = 'Aqui vas a ver la informacion completa del paciente y el estado.';
    appointmentDetailContent.classList.add('hidden');
    resetReschedulePanel(false);

    if (clearMessage) {
      appointmentDetailMessage.classList.add('hidden');
    }
  }

  function renderAppointments() {
    list.innerHTML = '';

    const visibleAppointments = currentAppointments.filter((appointment) => {
      return currentAppointmentFilter === 'all' || appointment.status === currentAppointmentFilter;
    });

    if (!visibleAppointments.length) {
      list.innerHTML = '<div class="empty-state">No hay turnos para el filtro seleccionado.</div>';
      return;
    }

    visibleAppointments.forEach((appointment) => {
      const item = document.createElement('article');
      item.className = 'appointment-item';
      item.innerHTML = `
        <div>
          <strong>${appointment.patient.name}</strong>
          <p class="muted">${appointment.patient.email} - ${appointment.patient.phone}</p>
          <p>${formatDateTime(appointment.dateTime)}</p>
        </div>
        <div class="availability-actions">
          <span class="status-pill">${appointment.status}</span>
          <button class="button ghost small" type="button" data-detail-id="${appointment.id}">Ver detalle</button>
        </div>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('[data-detail-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await openAppointmentDetail(Number(button.dataset.detailId));
        } catch (error) {
          showMessage(appointmentDetailMessage, error.message, true);
        }
      });
    });
  }

  async function loadAppointments() {
    const data = await fetchWithAuth('/me/appointments');
    currentAppointments = data.appointments;
    renderAppointments();
  }

  async function openAppointmentDetail(appointmentId) {
    const data = await fetchWithAuth(`/me/appointments/${appointmentId}`);
    const { appointment } = data;

    selectedAppointmentId = appointment.id;
    appointmentDetailTitle.textContent = appointment.patient.name;
    appointmentDetailMeta.textContent = formatDateTime(appointment.dateTime);
    appointmentDetailContent.classList.remove('hidden');
    appointmentDetailMessage.classList.add('hidden');
    document.getElementById('detailPatientName').textContent = appointment.patient.name;
    document.getElementById('detailPatientEmail').textContent = appointment.patient.email;
    document.getElementById('detailPatientPhone').textContent = appointment.patient.phone;
    document.getElementById('detailDateTime').textContent = formatDateTime(appointment.dateTime);
    document.getElementById('detailStatus').textContent = appointment.status;
    appointmentStatusSelect.value = appointment.status;
    toggleRescheduleButton.disabled = appointment.status !== 'booked';
    resetReschedulePanel(false);
  }

  async function loadRescheduleOptions() {
    const data = await fetchWithAuth(`/me/appointments/${selectedAppointmentId}/reschedule-options`);
    rescheduleOptions.innerHTML = '';
    selectedRescheduleDateTime = null;

    if (!data.slots.length) {
      rescheduleOptions.innerHTML = '<div class="empty-state">No hay horarios alternativos disponibles.</div>';
      return;
    }

    data.slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reschedule-option';
      button.innerHTML = `<span>${slot.date}</span><strong>${slot.time}</strong>`;

      button.addEventListener('click', () => {
        rescheduleOptions.querySelectorAll('.reschedule-option').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        selectedRescheduleDateTime = slot.dateTime;
      });

      rescheduleOptions.appendChild(button);
    });
  }

  function resetAvailabilityForm(clearMessage = true) {
    availabilityForm.reset();
    availabilityId.value = '';
    document.getElementById('slotDuration').value = '30';
    availabilityFormTitle.textContent = 'Agregar bloque';
    availabilitySubmit.textContent = 'Guardar bloque';
    cancelAvailabilityEdit.classList.add('hidden');

    if (clearMessage) {
      availabilityMessage.classList.add('hidden');
    }
  }

  function fillAvailabilityForm(availability) {
    availabilityId.value = availability.id;
    document.getElementById('dayOfWeek').value = String(availability.dayOfWeek);
    document.getElementById('startTime').value = availability.startTime;
    document.getElementById('endTime').value = availability.endTime;
    document.getElementById('slotDuration').value = String(availability.slotDuration);
    availabilityFormTitle.textContent = 'Editar bloque';
    availabilitySubmit.textContent = 'Guardar cambios';
    cancelAvailabilityEdit.classList.remove('hidden');
    availabilityMessage.classList.add('hidden');
  }

  async function loadAvailability() {
    const data = await fetchWithAuth('/me/availability');
    availabilityList.innerHTML = '';

    if (!data.availabilities.length) {
      availabilityList.innerHTML = '<div class="empty-state">Todavia no hay bloques semanales configurados.</div>';
      return;
    }

    data.availabilities.forEach((availability) => {
      const item = document.createElement('article');
      item.className = 'availability-item';
      item.innerHTML = `
        <div>
          <strong>${dayNames[availability.dayOfWeek]}</strong>
          <p class="muted">${availability.startTime} a ${availability.endTime}</p>
          <p>Turnos de ${availability.slotDuration} minutos</p>
        </div>
        <div class="availability-actions">
          <button class="button ghost small" type="button" data-edit-id="${availability.id}">Editar</button>
          <button class="button danger small" type="button" data-delete-id="${availability.id}">Eliminar</button>
        </div>
      `;
      availabilityList.appendChild(item);
    });

    availabilityList.querySelectorAll('[data-edit-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const availability = data.availabilities.find((item) => item.id === Number(button.dataset.editId));

        if (availability) {
          fillAvailabilityForm(availability);
        }
      });
    });

    availabilityList.querySelectorAll('[data-delete-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await fetchWithAuth(`/me/availability/${button.dataset.deleteId}`, { method: 'DELETE' });
          resetAvailabilityForm(false);
          showMessage(availabilityMessage, 'Disponibilidad eliminada correctamente.');
          await loadAvailability();
        } catch (error) {
          showMessage(availabilityMessage, error.message, true);
        }
      });
    });
  }

  availabilityForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      dayOfWeek: Number(document.getElementById('dayOfWeek').value),
      startTime: document.getElementById('startTime').value,
      endTime: document.getElementById('endTime').value,
      slotDuration: Number(document.getElementById('slotDuration').value)
    };

    const editingId = availabilityId.value;
    const url = editingId ? `/me/availability/${editingId}` : '/me/availability';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const result = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      resetAvailabilityForm(false);
      showMessage(availabilityMessage, result.message);
      await loadAvailability();
    } catch (error) {
      showMessage(availabilityMessage, error.message, true);
    }
  });

  cancelAvailabilityEdit.addEventListener('click', () => {
    resetAvailabilityForm();
  });

  appointmentFilters.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      currentAppointmentFilter = button.dataset.filter;
      renderAppointmentFilters();
      renderAppointments();
    });
  });

  saveAppointmentStatus.addEventListener('click', async () => {
    if (!selectedAppointmentId) {
      showMessage(appointmentDetailMessage, 'Primero selecciona un turno.', true);
      return;
    }

    try {
      const result = await fetchWithAuth(`/me/appointments/${selectedAppointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: appointmentStatusSelect.value })
      });

      await loadAppointments();
      await openAppointmentDetail(selectedAppointmentId);
      showMessage(appointmentDetailMessage, result.message);
    } catch (error) {
      showMessage(appointmentDetailMessage, error.message, true);
    }
  });

  cancelAppointmentButton.addEventListener('click', async () => {
    if (!selectedAppointmentId) {
      showMessage(appointmentDetailMessage, 'Primero selecciona un turno.', true);
      return;
    }

    try {
      const result = await fetchWithAuth(`/me/appointments/${selectedAppointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });

      await loadAppointments();
      await openAppointmentDetail(selectedAppointmentId);
      showMessage(appointmentDetailMessage, result.message);
    } catch (error) {
      showMessage(appointmentDetailMessage, error.message, true);
    }
  });

  toggleRescheduleButton.addEventListener('click', async () => {
    if (!selectedAppointmentId) {
      showMessage(appointmentDetailMessage, 'Primero selecciona un turno.', true);
      return;
    }

    try {
      await loadRescheduleOptions();
      reschedulePanel.classList.remove('hidden');
      appointmentDetailMessage.classList.add('hidden');
    } catch (error) {
      showMessage(appointmentDetailMessage, error.message, true);
    }
  });

  confirmRescheduleButton.addEventListener('click', async () => {
    if (!selectedAppointmentId) {
      showMessage(appointmentDetailMessage, 'Primero selecciona un turno.', true);
      return;
    }

    if (!selectedRescheduleDateTime) {
      showMessage(appointmentDetailMessage, 'Selecciona un horario alternativo.', true);
      return;
    }

    try {
      const result = await fetchWithAuth(`/me/appointments/${selectedAppointmentId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDateTime: selectedRescheduleDateTime })
      });

      await loadAppointments();
      await openAppointmentDetail(selectedAppointmentId);
      showMessage(appointmentDetailMessage, result.message);
    } catch (error) {
      showMessage(appointmentDetailMessage, error.message, true);
    }
  });

  cancelRescheduleButton.addEventListener('click', () => {
    resetReschedulePanel();
  });

  logoutButton.addEventListener('click', async () => {
    try { await fetchWithAuth('/auth/logout', { method: 'POST' }); } catch (_) {}
    clearToken();
    window.location.href = '/login';
  });

  try {
    dashboardSession = await fetchWithAuth('/auth/me');
    if (dashboardSession.user.role !== 'doctor') {
      window.location.href = '/dashboard-admin';
      return;
    }
    title.textContent = `Turnos confirmados de ${dashboardSession.user.name}`;
    subtitle.textContent = `${dashboardSession.doctor?.specialty ?? ''} - ${dashboardSession.user.email}`;
    renderAppointmentFilters();
    resetAppointmentDetail();
    await Promise.all([loadAppointments(), loadAvailability()]);
    resetAvailabilityForm();
  } catch (error) {
    if (error.message.toLowerCase().includes('sesion') || error.message.toLowerCase().includes('iniciar')) {
      window.location.href = '/login';
      return;
    }

    list.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

async function initChangePasswordPage() {
  const form = document.getElementById('changePasswordForm');
  const message = document.getElementById('changePasswordMessage');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
      showMessage(message, 'Las contrasenas no coinciden.', true);
      return;
    }

    try {
      await fetchWithAuth('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: document.getElementById('currentPassword').value,
          newPassword
        })
      });

      const session = await fetchWithAuth('/auth/me');
      if (session.user.role === 'superadmin') {
        window.location.href = '/dashboard-superadmin';
      } else if (session.user.role === 'admin' || session.user.role === 'secretary') {
        window.location.href = '/dashboard-admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      showMessage(message, error.message, true);
    }
  });
}

async function initAdminDashboardPage() {
  const adminTitle = document.getElementById('adminTitle');
  const adminSubtitle = document.getElementById('adminSubtitle');
  const logoutButton = document.getElementById('logoutButton');
  const toggleDoctorForm = document.getElementById('toggleDoctorForm');
  const doctorFormPanel = document.getElementById('doctorFormPanel');
  const doctorForm = document.getElementById('doctorForm');
  const cancelDoctorForm = document.getElementById('cancelDoctorForm');
  const doctorFormMessage = document.getElementById('doctorFormMessage');
  const tempPasswordBox = document.getElementById('tempPasswordBox');
  const tempPasswordValue = document.getElementById('tempPasswordValue');
  const doctorsList = document.getElementById('doctorsList');
  const editingDoctorId = document.getElementById('editingDoctorId');
  const doctorFormTitle = document.getElementById('doctorFormTitle');
  const doctorFormSubmit = document.getElementById('doctorFormSubmit');
  const newDoctorExtras = document.getElementById('newDoctorExtras');
  const matriculasContainer = document.getElementById('matriculasContainer');
  const servicesContainer = document.getElementById('servicesContainer');
  const addMatriculaRow = document.getElementById('addMatriculaRow');
  const addServiceRow = document.getElementById('addServiceRow');

  const serviceMatriculaPanel = document.getElementById('serviceMatriculaPanel');
  const panelDoctorName = document.getElementById('panelDoctorName');
  const closePanelButton = document.getElementById('closePanelButton');
  const servicesList = document.getElementById('servicesList');
  const serviceForm = document.getElementById('serviceForm');
  const serviceMessage = document.getElementById('serviceMessage');
  const editingServiceId = document.getElementById('editingServiceId');
  const cancelServiceEdit = document.getElementById('cancelServiceEdit');
  const matriculasList = document.getElementById('matriculasList');
  const matriculaForm = document.getElementById('matriculaForm');
  const matriculaMessage = document.getElementById('matriculaMessage');

  let activeDoctorId = null;
  let doctors = [];

  function addMatriculaRowEl() {
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
      <label>Tipo
        <select class="m-type">
          <option value="nacional">Nacional</option>
          <option value="provincial">Provincial</option>
        </select>
      </label>
      <label>Numero<input class="m-number" type="text" placeholder="MN 12345" /></label>
      <label>Provincia<input class="m-province" type="text" placeholder="Opcional" /></label>
      <button class="button danger small" type="button" style="margin-bottom:2px">✕</button>
    `;
    row.querySelector('button').addEventListener('click', () => row.remove());
    matriculasContainer.appendChild(row);
  }

  function addServiceRowEl() {
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
      <label>Nombre<input class="s-name" type="text" placeholder="Consulta general" /></label>
      <label>Minutos<input class="s-duration" type="number" min="1" placeholder="30" /></label>
      <label>Precio<input class="s-price" type="number" min="0" step="0.01" placeholder="Opcional" /></label>
      <button class="button danger small" type="button" style="margin-bottom:2px">✕</button>
    `;
    row.querySelector('button').addEventListener('click', () => row.remove());
    servicesContainer.appendChild(row);
  }

  addMatriculaRow.addEventListener('click', addMatriculaRowEl);
  addServiceRow.addEventListener('click', addServiceRowEl);

  function resetDoctorForm() {
    doctorForm.reset();
    editingDoctorId.value = '';
    doctorFormTitle.textContent = 'Alta de profesional';
    doctorFormSubmit.textContent = 'Guardar';
    document.getElementById('doctorEmail').disabled = false;
    tempPasswordBox.classList.add('hidden');
    doctorFormMessage.classList.add('hidden');
    matriculasContainer.innerHTML = '';
    servicesContainer.innerHTML = '';
    newDoctorExtras.classList.remove('hidden');
  }

  function openDoctorForm() {
    resetDoctorForm();
    doctorFormPanel.classList.remove('hidden');
    toggleDoctorForm.textContent = '— Cerrar formulario';
  }

  function closeDoctorForm() {
    doctorFormPanel.classList.add('hidden');
    toggleDoctorForm.textContent = '+ Agregar doctor';
    resetDoctorForm();
  }

  toggleDoctorForm.addEventListener('click', () => {
    doctorFormPanel.classList.contains('hidden') ? openDoctorForm() : closeDoctorForm();
  });

  cancelDoctorForm.addEventListener('click', closeDoctorForm);

  async function loadDoctors() {
    const data = await fetchWithAuth('/admin/doctors');
    doctors = data.doctors;
    renderDoctors();
  }

  function renderDoctors() {
    doctorsList.innerHTML = '';

    if (!doctors.length) {
      doctorsList.innerHTML = '<div class="empty-state">Todavia no hay doctores en este consultorio.</div>';
      return;
    }

    doctors.forEach((link) => {
      const { doctor } = link;
      const item = document.createElement('article');
      item.className = 'availability-item';
      item.innerHTML = `
        <div>
          <strong>${doctor.user.name}</strong>
          <p class="muted">${doctor.specialty} · ${doctor.user.email}</p>
          <p class="muted">${doctor.services.length} servicio(s) · ${doctor.matriculas.length} matricula(s)</p>
          <span class="status-pill">${link.active ? 'activo' : 'inactivo'}</span>
        </div>
        <div class="availability-actions">
          <button class="button ghost small" type="button" data-edit-doctor="${doctor.id}">Editar</button>
          <button class="button ghost small" type="button" data-manage-doctor="${doctor.id}" data-doctor-name="${doctor.user.name}">Servicios y matriculas</button>
          ${link.active
            ? `<button class="button danger small" type="button" data-deactivate-doctor="${doctor.id}">Desactivar</button>`
            : `<button class="button ghost small" type="button" data-activate-doctor="${doctor.id}">Reactivar</button>`}
        </div>
      `;
      doctorsList.appendChild(item);
    });

    doctorsList.querySelectorAll('[data-edit-doctor]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const doctorId = Number(btn.dataset.editDoctor);
        const link = doctors.find((l) => l.doctor.id === doctorId);
        if (!link) return;
        const { doctor } = link;
        editingDoctorId.value = doctorId;
        document.getElementById('doctorEmail').value = doctor.user.email;
        document.getElementById('doctorEmail').disabled = true;
        document.getElementById('doctorName').value = doctor.user.name;
        document.getElementById('doctorSlug').value = doctor.slug;
        specialtySelect.value = doctor.specialty;
        document.getElementById('doctorBio').value = doctor.bio || '';
        doctorFormTitle.textContent = 'Editar doctor';
        doctorFormSubmit.textContent = 'Guardar cambios';
        newDoctorExtras.classList.add('hidden');
        doctorFormPanel.classList.remove('hidden');
        toggleDoctorForm.textContent = '— Cerrar formulario';
        doctorFormMessage.classList.add('hidden');
        tempPasswordBox.classList.add('hidden');
      });
    });

    doctorsList.querySelectorAll('[data-manage-doctor]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeDoctorId = Number(btn.dataset.manageDoctor);
        panelDoctorName.textContent = btn.dataset.doctorName;
        serviceMatriculaPanel.classList.remove('hidden');
        serviceMatriculaPanel.scrollIntoView({ behavior: 'smooth' });
        loadServicesAndMatriculas();
      });
    });

    doctorsList.querySelectorAll('[data-deactivate-doctor]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Seguro que queres desactivar este doctor del consultorio?')) return;
        try {
          await fetchWithAuth(`/admin/doctors/${btn.dataset.deactivateDoctor}`, { method: 'DELETE' });
          await loadDoctors();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    doctorsList.querySelectorAll('[data-activate-doctor]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Reactivar este doctor en el consultorio?')) return;
        try {
          await fetchWithAuth(`/admin/doctors/${btn.dataset.activateDoctor}/activate`, { method: 'PATCH' });
          await loadDoctors();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  }

  doctorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = editingDoctorId.value;

    const payload = {
      email: document.getElementById('doctorEmail').value.trim(),
      name: document.getElementById('doctorName').value.trim(),
      slug: document.getElementById('doctorSlug').value.trim(),
      specialty: document.getElementById('doctorSpecialty').value.trim(),
      bio: document.getElementById('doctorBio').value.trim()
    };

    try {
      if (id) {
        await fetchWithAuth(`/admin/doctors/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showMessage(doctorFormMessage, 'Doctor actualizado correctamente.');
      } else {
        const result = await fetchWithAuth('/admin/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const doctorId = result.doctor.id;

        const matriculaRows = [...matriculasContainer.querySelectorAll('.dynamic-row')];
        for (const row of matriculaRows) {
          const number = row.querySelector('.m-number').value.trim();
          if (!number) continue;
          await fetchWithAuth(`/admin/doctors/${doctorId}/matriculas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: row.querySelector('.m-type').value,
              number,
              province: row.querySelector('.m-province').value.trim() || null
            })
          });
        }

        const serviceRows = [...servicesContainer.querySelectorAll('.dynamic-row')];
        for (const row of serviceRows) {
          const name = row.querySelector('.s-name').value.trim();
          const duration = row.querySelector('.s-duration').value;
          if (!name || !duration) continue;
          await fetchWithAuth(`/admin/doctors/${doctorId}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              duration: Number(duration),
              price: row.querySelector('.s-price').value || null
            })
          });
        }

        if (result.tempPassword) {
          tempPasswordValue.textContent = result.tempPassword;
          tempPasswordBox.classList.remove('hidden');
        }
        showMessage(doctorFormMessage, result.message);
        await loadDoctors();
      }
    } catch (error) {
      showMessage(doctorFormMessage, error.message, true);
    }
  });

  async function loadServicesAndMatriculas() {
    const link = doctors.find((l) => l.doctor.id === activeDoctorId);
    if (!link) return;

    servicesList.innerHTML = '';
    if (!link.doctor.services.length) {
      servicesList.innerHTML = '<div class="empty-state">Sin servicios cargados.</div>';
    } else {
      link.doctor.services.forEach((s) => {
        const item = document.createElement('article');
        item.className = 'availability-item';
        item.innerHTML = `
          <div>
            <strong>${s.name}</strong>
            <p class="muted">${s.duration} min${s.price ? ` · $${s.price}` : ''}</p>
          </div>
          <div class="availability-actions">
            <button class="button ghost small" data-edit-service="${s.id}">Editar</button>
            <button class="button danger small" data-delete-service="${s.id}">Eliminar</button>
          </div>
        `;
        servicesList.appendChild(item);
      });

      servicesList.querySelectorAll('[data-edit-service]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const s = link.doctor.services.find((x) => x.id === Number(btn.dataset.editService));
          if (!s) return;
          editingServiceId.value = s.id;
          document.getElementById('serviceName').value = s.name;
          document.getElementById('serviceDuration').value = s.duration;
          document.getElementById('servicePrice').value = s.price || '';
          document.getElementById('serviceFormSubmit').textContent = 'Guardar cambios';
          cancelServiceEdit.classList.remove('hidden');
        });
      });

      servicesList.querySelectorAll('[data-delete-service]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Eliminar este servicio?')) return;
          try {
            await fetchWithAuth(`/admin/doctors/${activeDoctorId}/services/${btn.dataset.deleteService}`, { method: 'DELETE' });
            await loadDoctors();
            loadServicesAndMatriculas();
          } catch (error) {
            showMessage(serviceMessage, error.message, true);
          }
        });
      });
    }

    matriculasList.innerHTML = '';
    if (!link.doctor.matriculas.length) {
      matriculasList.innerHTML = '<div class="empty-state">Sin matriculas cargadas.</div>';
    } else {
      link.doctor.matriculas.forEach((m) => {
        const item = document.createElement('article');
        item.className = 'availability-item';
        item.innerHTML = `
          <div>
            <strong>${m.number}</strong>
            <p class="muted">${m.type}${m.province ? ` · ${m.province}` : ''}</p>
          </div>
          <div class="availability-actions">
            <button class="button danger small" data-delete-matricula="${m.id}">Eliminar</button>
          </div>
        `;
        matriculasList.appendChild(item);
      });

      matriculasList.querySelectorAll('[data-delete-matricula]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Eliminar esta matricula?')) return;
          try {
            await fetchWithAuth(`/admin/doctors/${activeDoctorId}/matriculas/${btn.dataset.deleteMatricula}`, { method: 'DELETE' });
            await loadDoctors();
            loadServicesAndMatriculas();
          } catch (error) {
            showMessage(matriculaMessage, error.message, true);
          }
        });
      });
    }
  }

  serviceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = editingServiceId.value;
    const payload = {
      name: document.getElementById('serviceName').value.trim(),
      duration: Number(document.getElementById('serviceDuration').value),
      price: document.getElementById('servicePrice').value || null
    };

    try {
      if (id) {
        await fetchWithAuth(`/admin/doctors/${activeDoctorId}/services/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetchWithAuth(`/admin/doctors/${activeDoctorId}/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      serviceForm.reset();
      editingServiceId.value = '';
      document.getElementById('serviceFormSubmit').textContent = 'Guardar servicio';
      cancelServiceEdit.classList.add('hidden');
      showMessage(serviceMessage, 'Servicio guardado.');
      await loadDoctors();
      loadServicesAndMatriculas();
    } catch (error) {
      showMessage(serviceMessage, error.message, true);
    }
  });

  cancelServiceEdit.addEventListener('click', () => {
    serviceForm.reset();
    editingServiceId.value = '';
    document.getElementById('serviceFormSubmit').textContent = 'Guardar servicio';
    cancelServiceEdit.classList.add('hidden');
  });

  matriculaForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      type: document.getElementById('matriculaType').value,
      number: document.getElementById('matriculaNumber').value.trim(),
      province: document.getElementById('matriculaProvince').value.trim() || null
    };

    try {
      await fetchWithAuth(`/admin/doctors/${activeDoctorId}/matriculas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      matriculaForm.reset();
      showMessage(matriculaMessage, 'Matricula agregada.');
      await loadDoctors();
      loadServicesAndMatriculas();
    } catch (error) {
      showMessage(matriculaMessage, error.message, true);
    }
  });

  closePanelButton.addEventListener('click', () => {
    serviceMatriculaPanel.classList.add('hidden');
    activeDoctorId = null;
  });

  logoutButton.addEventListener('click', async () => {
    try { await fetchWithAuth('/auth/logout', { method: 'POST' }); } catch (_) {}
    clearToken();
    window.location.href = '/login';
  });

  const specialtySelect = document.getElementById('doctorSpecialty');
  try {
    const specialties = await getJson('/specialties');
    specialties.forEach((s) => {
      const option = document.createElement('option');
      option.value = s;
      option.textContent = s;
      specialtySelect.appendChild(option);
    });
  } catch (_) {}

  try {
    const session = await fetchWithAuth('/auth/me');
    adminTitle.textContent = session.user.name;
    adminSubtitle.textContent = `Administrador del consultorio`;
    await loadDoctors();
  } catch (error) {
    window.location.href = '/login';
  }
}

async function initSuperadminDashboardPage() {
  const superadminTitle = document.getElementById('superadminTitle');
  const logoutButton = document.getElementById('logoutButton');
  const toggleForm = document.getElementById('toggleForm');
  const formPanel = document.getElementById('formPanel');
  const cancelForm = document.getElementById('cancelForm');
  const consulorioForm = document.getElementById('consulorioForm');
  const formMessage = document.getElementById('formMessage');
  const tempPasswordBox = document.getElementById('tempPasswordBox');
  const tempPasswordValue = document.getElementById('tempPasswordValue');
  const tempAdminEmail = document.getElementById('tempAdminEmail');
  const consuloriosList = document.getElementById('consuloriosList');

  const planLabels = { trial: 'Trial', basic: 'Basic', pro: 'Pro' };

  function planStatus(c) {
    if (!c.planExpiresAt) return { label: 'Sin vencimiento', css: '' };
    const diff = Math.ceil((new Date(c.planExpiresAt) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `Vencido hace ${Math.abs(diff)} dias`, css: 'status-expired' };
    if (diff <= 7) return { label: `Vence en ${diff} dias`, css: 'status-warning' };
    return { label: `Vence ${new Date(c.planExpiresAt).toLocaleDateString('es-AR')}`, css: 'status-ok' };
  }

  function openForm() {
    formPanel.classList.remove('hidden');
    toggleForm.textContent = '— Cerrar formulario';
    tempPasswordBox.classList.add('hidden');
    formMessage.classList.add('hidden');
  }

  function closeForm() {
    formPanel.classList.add('hidden');
    toggleForm.textContent = '+ Nuevo consultorio';
    consulorioForm.reset();
    tempPasswordBox.classList.add('hidden');
    formMessage.classList.add('hidden');
  }

  toggleForm.addEventListener('click', () => {
    formPanel.classList.contains('hidden') ? openForm() : closeForm();
  });
  cancelForm.addEventListener('click', closeForm);

  async function loadConsultorios() {
    const data = await fetchWithAuth('/superadmin/consultorios');
    consuloriosList.innerHTML = '';

    if (!data.consultorios.length) {
      consuloriosList.innerHTML = '<div class="empty-state">No hay consultorios registrados todavia.</div>';
      return;
    }

    data.consultorios.forEach((c) => {
      const admin = c.members[0]?.user;
      const status = planStatus(c);
      const item = document.createElement('article');
      item.className = 'availability-item';
      item.innerHTML = `
        <div>
          <strong>${c.name}</strong>
          <p class="muted">/${c.slug} · ${admin ? admin.email : 'sin admin'}</p>
          <p class="muted">${c.doctorLinks.length} doctor(es) · ${c._count.patients} paciente(s) · ${c._count.appointments} turno(s)</p>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-top:0.25rem;">
            <span class="status-pill">${planLabels[c.plan] || c.plan}</span>
            <span class="status-pill ${status.css}">${status.label}</span>
          </div>
        </div>
        <div class="availability-actions">
          <select class="plan-select" data-consultorio-id="${c.id}">
            <option value="trial" ${c.plan === 'trial' ? 'selected' : ''}>Trial</option>
            <option value="basic" ${c.plan === 'basic' ? 'selected' : ''}>Basic</option>
            <option value="pro" ${c.plan === 'pro' ? 'selected' : ''}>Pro</option>
          </select>
          <select class="months-select">
            <option value="1">1 mes</option>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </select>
          <button class="button primary small" type="button" data-renew="${c.id}">Renovar</button>
        </div>
      `;
      consuloriosList.appendChild(item);
    });

    consuloriosList.querySelectorAll('[data-renew]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('article');
        const plan = card.querySelector('.plan-select').value;
        const months = card.querySelector('.months-select').value;
        try {
          await fetchWithAuth(`/superadmin/consultorios/${btn.dataset.renew}/plan`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan, months })
          });
          await loadConsultorios();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  }

  consulorioForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const result = await fetchWithAuth('/superadmin/consultorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('consulorioName').value.trim(),
          slug: document.getElementById('consulorioSlug').value.trim(),
          adminName: document.getElementById('adminName').value.trim(),
          adminEmail: document.getElementById('adminEmail').value.trim(),
          plan: document.getElementById('consulorioPlan').value
        })
      });

      showMessage(formMessage, result.message);
      tempAdminEmail.textContent = result.consultorio.members[0].user.email;
      tempPasswordValue.textContent = result.tempPassword;
      tempPasswordBox.classList.remove('hidden');
      consulorioForm.reset();
      await loadConsultorios();
    } catch (error) {
      showMessage(formMessage, error.message, true);
    }
  });

  logoutButton.addEventListener('click', async () => {
    try { await fetchWithAuth('/auth/logout', { method: 'POST' }); } catch (_) {}
    clearToken();
    window.location.href = '/login';
  });

  try {
    const session = await fetchWithAuth('/auth/me');
    superadminTitle.textContent = session.user.name;
    await loadConsultorios();
  } catch (error) {
    window.location.href = '/login';
  }
}

if (document.body.dataset.page === 'login') {
  initLoginPage();
}

if (document.body.dataset.page === 'doctor') {
  initDoctorPage();
}

if (document.body.dataset.page === 'dashboard') {
  initDashboardPage();
}

if (document.body.dataset.page === 'dashboard-admin') {
  initAdminDashboardPage();
}

if (document.body.dataset.page === 'change-password') {
  initChangePasswordPage();
}

if (document.body.dataset.page === 'dashboard-superadmin') {
  initSuperadminDashboardPage();
}
