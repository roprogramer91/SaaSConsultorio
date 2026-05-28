import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import meAppointmentRoutes from './routes/meAppointmentRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import specialtyRoutes from './routes/specialtyRoutes.js';
import { requireDashboardPageAuth } from './middleware/authMiddleware.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../../frontend');
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(frontendPath));

app.use(authRoutes);
app.use(specialtyRoutes);
app.use(adminRoutes);
app.use(availabilityRoutes);
app.use(meAppointmentRoutes);
app.use(doctorRoutes);
app.use(appointmentRoutes);

app.get('/login', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'home.html'));
});

app.get('/dashboard', requireDashboardPageAuth, (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

app.get('/dashboard-admin', requireDashboardPageAuth, (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard-admin.html'));
});

app.get('/change-password', requireDashboardPageAuth, (req, res) => {
  res.sendFile(path.join(frontendPath, 'change-password.html'));
});

app.get('/:slug', (req, res) => {
  res.sendFile(path.join(frontendPath, 'doctor.html'));
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  console.error(error);
  res.status(statusCode).json({
    message: error.message || 'Ocurrio un error interno'
  });
});

app.listen(port, () => {
  console.log(`MiConsultorio escuchando en http://localhost:${port}`);
});
