import { Module } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { MedicinesResolver } from './medicines.resolver';

@Module({
  providers: [MedicinesResolver, MedicinesService],
})
export class MedicinesModule {}
