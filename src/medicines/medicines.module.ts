import { Module } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { MedicinesResolver } from './medicines.resolver';
import { CategoriaMedicamentoService } from './categoria-medicamento.service';
import { CategoriaMedicamentoResolver } from './categoria-medicamento.resolver';
import { PrismaService } from '../shared/prisma/prisma.service';

@Module({
  providers: [
    MedicinesResolver,
    MedicinesService,
    CategoriaMedicamentoResolver,
    CategoriaMedicamentoService,
    PrismaService,
  ],
})
export class MedicinesModule {}
