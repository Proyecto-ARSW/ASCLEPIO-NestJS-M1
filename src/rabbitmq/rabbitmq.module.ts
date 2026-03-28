import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitmqService } from './rabbitmq.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATIONS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: 'email.queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  providers: [RabbitmqService, PrismaService],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}
