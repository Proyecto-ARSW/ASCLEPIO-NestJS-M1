import { Module } from '@nestjs/common';
import { AppoinmentsService } from './appoinments.service';
import { AppoinmentsResolver } from './appoinments.resolver';

@Module({
  providers: [AppoinmentsResolver, AppoinmentsService],
})
export class AppoinmentsModule {}
