-- CreateTable
CREATE TABLE "DoctorMatricula" (
    "id" SERIAL NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "province" TEXT,

    CONSTRAINT "DoctorMatricula_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DoctorMatricula" ADD CONSTRAINT "DoctorMatricula_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
