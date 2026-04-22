import { Injectable, Logger } from '@nestjs/common';
import { connect } from 'amqplib';

@Injectable()
export class ClinicalEventsPublisher {
  private readonly logger = new Logger(ClinicalEventsPublisher.name);
  private readonly exchange = 'clinical.events';
  private connection: any;
  private channel: any;
  private initialized = false;

  async ensureConnection(): Promise<void> {
    if (this.initialized && this.channel) {
      return;
    }

    try {
      const rabbitmqUrl =
        process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      this.connection = await connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });
      this.initialized = true;
      this.logger.log('ClinicalEventsPublisher connected');
    } catch (error) {
      this.logger.error('Failed to initialize publisher:', error);
      throw error;
    }
  }

  async publish(
    routingKey: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.ensureConnection();
      const msg = Buffer.from(JSON.stringify(payload));
      this.channel.publish(this.exchange, routingKey, msg, {
        persistent: true,
      });
      this.logger.debug(`Published ${routingKey}:`, payload);
    } catch (error) {
      this.logger.error(`Failed to publish ${routingKey}:`, error);
    }
  }
}
// Daniel Useche
