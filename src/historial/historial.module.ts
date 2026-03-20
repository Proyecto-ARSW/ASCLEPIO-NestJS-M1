import { Module } from '@nestjs/common';
import { HistorialService } from './historial.service';
import { HistorialResolver } from './historial.resolver';
import { PrismaService } from '../shared/prisma/prisma.service';

@Module({
  providers: [HistorialResolver, HistorialService, PrismaService],
})
export class HistorialModule {}
