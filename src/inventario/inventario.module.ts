import { Module } from '@nestjs/common';
import { SedesService } from './sedes.service';
import { SedesResolver } from './sedes.resolver';
import { InventarioService } from './inventario.service';
import { InventarioResolver } from './inventario.resolver';
import { PrismaService } from '../shared/prisma/prisma.service';

@Module({
  providers: [
    SedesResolver,
    SedesService,
    InventarioResolver,
    InventarioService,
    PrismaService,
  ],
})
export class InventarioModule {}
