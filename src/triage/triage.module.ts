import { Module } from '@nestjs/common';
import { TriageResolver } from './triage.resolver';
import { TriageService } from './triage.service';

@Module({
  providers: [TriageResolver, TriageService],
})
export class TriageModule {}
