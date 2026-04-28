import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TriageWebhookController } from './triage-webhook.controller';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { TurnModule } from '../turn/turn.module';

@Module({
  imports: [ConfigModule, RabbitmqModule, TurnModule],
  controllers: [TriageWebhookController],
})
export class TriageWebhookModule {}