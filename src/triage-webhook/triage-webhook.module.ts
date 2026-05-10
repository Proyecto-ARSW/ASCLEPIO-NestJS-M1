import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TriageWebhookController } from './triage-webhook.controller';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { TurnModule } from '../turn/turn.module';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  imports: [ConfigModule, RabbitmqModule, TurnModule],
  controllers: [TriageWebhookController],
  providers: [ApiKeyGuard],
})
export class TriageWebhookModule {}