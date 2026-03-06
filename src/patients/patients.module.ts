import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsResolver } from './patients.resolver';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Module({
  providers: [PatientsResolver, PatientsService, PrismaService],
})
export class PatientsModule {}
