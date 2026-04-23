
import { Module } from '@nestjs/common';
import { TriageWebhookController } from './triage-webhook.controller';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  controllers: [TriageWebhookController],
  providers: [ApiKeyGuard],
})
export class TriageWebhookModule {}