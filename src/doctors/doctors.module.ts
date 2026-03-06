import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsResolver } from './doctors.resolver';
import { PrismaService } from '../shared/prisma/prisma.service';

@Module({
  providers: [DoctorsResolver, DoctorsService, PrismaService],
})
export class DoctorsModule {}
