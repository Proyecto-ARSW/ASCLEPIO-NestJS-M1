import { Module } from '@nestjs/common';
import { ConsentimientosService } from './consentimientos.service';
import { ConsentimientosResolver } from './consentimientos.resolver';
import { PrismaService } from '../shared/prisma/prisma.service';

@Module({
  providers: [ConsentimientosResolver, ConsentimientosService, PrismaService],
})
export class ConsentimientosModule {}
