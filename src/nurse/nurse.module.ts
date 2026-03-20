import { Module } from '@nestjs/common';
import { NurseService } from './nurse.service';
import { NurseResolver } from './nurse.resolver';
import { DisponibilidadEnfermeroService } from './disponibilidad-enfermero.service';
import { DisponibilidadEnfermeroResolver } from './disponibilidad-enfermero.resolver';
import { PrismaService } from '../shared/prisma/prisma.service';

@Module({
  providers: [
    NurseResolver,
    NurseService,
    DisponibilidadEnfermeroResolver,
    DisponibilidadEnfermeroService,
    PrismaService,
  ],
})
export class NurseModule {}
