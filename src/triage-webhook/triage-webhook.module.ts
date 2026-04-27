import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TriageWebhookController } from './triage-webhook.controller';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [ConfigModule, RabbitmqModule],
  controllers: [TriageWebhookController],
})
export class TriageWebhookModule {}