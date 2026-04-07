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
            // get() en lugar de getOrThrow(): si RABBITMQ_URL no está configurado en
            // Azure App Settings, la app NO crashea — el módulo arranca en modo degradado
            // y los eventos de notificación fallarán silenciosamente (warn en el log).
            urls: [config.get<string>('RABBITMQ_URL') ?? 'amqp://localhost:5672'],
            queue: 'email.queue',
            queueOptions: { durable: true },
            // socketOptions.reconnectTimeInSeconds: si RabbitMQ no está disponible al
            // arrancar, NestJS reintenta la conexión en lugar de crashear.
            socketOptions: {
              reconnectTimeInSeconds: 10,
            },
          },
        }),
      },
    ]),
  ],
  providers: [RabbitmqService, PrismaService],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}

// Daniel Useche
