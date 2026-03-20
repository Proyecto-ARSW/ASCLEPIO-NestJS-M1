import { Module } from '@nestjs/common';
import { RecetasService } from './recetas.service';
import { RecetasResolver } from './recetas.resolver';
import { PrismaService } from '../shared/prisma/prisma.service';

@Module({
  providers: [RecetasResolver, RecetasService, PrismaService],
})
export class RecetasModule {}
