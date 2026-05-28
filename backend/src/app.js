import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import meAppointmentRoutes from './routes/meAppointmentRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import specialtyRoutes from './routes/specialtyRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../../frontend');
const port = Number(process.env.PORT) || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.static(frontendPath));

app.use(authRoutes);
app.use(specialtyRoutes);
app.use(superadminRoutes);
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

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

app.get('/dashboard-admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard-admin.html'));
});

app.get('/dashboard-superadmin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard-superadmin.html'));
});

app.get('/change-password', (req, res) => {
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
