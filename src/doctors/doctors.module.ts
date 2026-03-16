import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsResolver } from './doctors.resolver';
import { DisponibilidadService } from './disponibilidad.service';
import { DisponibilidadResolver } from './disponibilidad.resolver';
import { PrismaService } from '../shared/prisma/prisma.service';

@Module({
  providers: [
    DoctorsResolver,
    DoctorsService,
    DisponibilidadResolver,
    DisponibilidadService,
    PrismaService,
  ],
})
export class DoctorsModule {}
