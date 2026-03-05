import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsResolver } from './doctors.resolver';

@Module({
  providers: [DoctorsResolver, DoctorsService],
})
export class DoctorsModule {}
