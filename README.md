# MiConsultorio MVP

MVP de reservas medicas para un SaaS multi-tenant por `doctorId`.

## Stack

- Backend: Node.js + Express
- ORM: Prisma
- Base de datos: PostgreSQL
- Frontend: HTML + CSS + JavaScript

## Estructura

```text
backend/
  prisma/
  src/
frontend/
```

## Puesta en marcha

1. Copiar `backend/.env.example` a `backend/.env` y ajustar `DATABASE_URL` y `JWT_SECRET`.
2. Instalar dependencias en `backend` con `npm install`.
3. Generar Prisma Client con `npm run prisma:generate`.
4. Crear la base con `npx prisma migrate dev --name init`.
5. Configurar `JWT_SECRET` en `backend/.env`.
6. Cargar el doctor demo con `npm run prisma:seed`.
7. Levantar el servidor con `npm run dev`.

## Rutas principales

- `GET /doctors/:slug`
- `GET /doctors/:slug/availability`
- `POST /appointments`
- `POST /auth/login`
- `GET /auth/me`
- `GET /me/availability`
- `POST /me/availability`
- `PUT /me/availability/:id`
- `DELETE /me/availability/:id`
- `GET /me/appointments`
- `GET /me/appointments/:id`
- `PATCH /me/appointments/:id/status`
- `GET /me/appointments/:id/reschedule-options`
- `PATCH /me/appointments/:id/reschedule`
- `GET /doctors/:doctorId/appointments`
- `GET /`
- `GET /:slug`
- `GET /login`
- `GET /dashboard`

## Demo incluida

- Slug demo: `dra-maria-perez`
- Login demo: `/login`
- Credenciales demo: `maria.perez@miconsultorio.com` / `demo1234`
- Si ya tenias el seed anterior, vuelve a ejecutar `npm run prisma:seed` para guardar el password hasheado.

## Disponibilidad semanal

- El doctor autenticado puede gestionar su disponibilidad desde el dashboard.
- Validaciones actuales: `startTime < endTime`, `slotDuration > 0`, sin duplicados exactos y sin solapamientos en el mismo dia.
- La landing publica reutiliza automaticamente la disponibilidad guardada en base, sin configuracion extra.

## Gestion de turnos

- El dashboard usa rutas privadas `/me/appointments` para listar y ver detalle de turnos del doctor autenticado.
- El estado del turno puede cambiar entre `booked`, `cancelled` y `completed`.
- Los turnos `booked` se pueden reprogramar a otro horario valido dentro de la disponibilidad actual del doctor.
- La reprogramacion no permite horarios ocupados ni horarios fuera de agenda.
- Si actualizas el schema por el nuevo estado `completed`, corre una migracion de Prisma antes de usar ese cambio en la base.
