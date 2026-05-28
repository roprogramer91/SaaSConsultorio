import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('demo1234', 10);

  // Consultorio demo
  const consultorio = await prisma.consultorio.upsert({
    where: { slug: 'policonsultorio-san-martin' },
    update: { name: 'Policonsultorio San Martin' },
    create: {
      name: 'Policonsultorio San Martin',
      slug: 'policonsultorio-san-martin',
      plan: 'trial'
    }
  });

  // Usuario admin del consultorio
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sanmartin.com' },
    update: { name: 'Admin San Martin', password: hashedPassword },
    create: {
      email: 'admin@sanmartin.com',
      password: hashedPassword,
      name: 'Admin San Martin',
      role: 'admin'
    }
  });

  await prisma.consultorioMember.upsert({
    where: { consulorioId_userId: { consulorioId: consultorio.id, userId: adminUser.id } },
    update: {},
    create: { consulorioId: consultorio.id, userId: adminUser.id, role: 'admin' }
  });

  // Usuario doctor
  const doctorUser = await prisma.user.upsert({
    where: { email: 'maria.perez@miconsultorio.com' },
    update: { name: 'Dra. Maria Perez', password: hashedPassword },
    create: {
      email: 'maria.perez@miconsultorio.com',
      password: hashedPassword,
      name: 'Dra. Maria Perez',
      role: 'doctor'
    }
  });

  // Perfil doctor
  const doctor = await prisma.doctor.upsert({
    where: { slug: 'dra-maria-perez' },
    update: {
      specialty: 'Clinica medica',
      bio: 'Atencion integral para adultos, seguimiento clinico y controles preventivos con foco en una consulta cercana y clara.'
    },
    create: {
      userId: doctorUser.id,
      slug: 'dra-maria-perez',
      specialty: 'Clinica medica',
      bio: 'Atencion integral para adultos, seguimiento clinico y controles preventivos con foco en una consulta cercana y clara.'
    }
  });

  // Vincular doctor al consultorio
  await prisma.doctorConsultorio.upsert({
    where: { doctorId_consulorioId: { doctorId: doctor.id, consulorioId: consultorio.id } },
    update: { active: true },
    create: { doctorId: doctor.id, consulorioId: consultorio.id, active: true }
  });

  // Servicios del doctor
  await prisma.service.deleteMany({ where: { doctorId: doctor.id } });
  await prisma.service.createMany({
    data: [
      { doctorId: doctor.id, name: 'Consulta general', duration: 30, price: 5000 },
      { doctorId: doctor.id, name: 'Control preventivo', duration: 45, price: 7000 },
      { doctorId: doctor.id, name: 'Electrocardiograma', duration: 20, price: 4000 }
    ]
  });

  // Matrículas del doctor
  await prisma.doctorMatricula.deleteMany({ where: { doctorId: doctor.id } });
  await prisma.doctorMatricula.createMany({
    data: [
      { doctorId: doctor.id, type: 'nacional', number: 'MN 12345' },
      { doctorId: doctor.id, type: 'provincial', number: 'MP 67890', province: 'Buenos Aires' }
    ]
  });

  // Disponibilidad del doctor en este consultorio
  await prisma.availability.deleteMany({ where: { doctorId: doctor.id, consulorioId: consultorio.id } });
  await prisma.availability.createMany({
    data: [
      { doctorId: doctor.id, consulorioId: consultorio.id, dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
      { doctorId: doctor.id, consulorioId: consultorio.id, dayOfWeek: 2, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
      { doctorId: doctor.id, consulorioId: consultorio.id, dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
      { doctorId: doctor.id, consulorioId: consultorio.id, dayOfWeek: 4, startTime: '14:00', endTime: '18:00', slotDuration: 30 },
      { doctorId: doctor.id, consulorioId: consultorio.id, dayOfWeek: 5, startTime: '09:00', endTime: '12:00', slotDuration: 30 }
    ]
  });

  console.log(`Consultorio: ${consultorio.slug}`);
  console.log(`Admin: ${adminUser.email}`);
  console.log(`Doctor: ${doctorUser.email} / slug: ${doctor.slug}`);
  console.log('Credenciales demo: demo1234');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
