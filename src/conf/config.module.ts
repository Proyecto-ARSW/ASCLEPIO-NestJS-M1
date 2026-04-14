import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        // default(8080): Azure App Service Linux inyecta PORT=8080 automáticamente, pero
        // hacerlo required() crashea si por alguna razón la variable no llega antes de
        // que Joi valide. Con default() la app siempre tiene un puerto válido.
        PORT: Joi.number().default(8080),
        DATABASE_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('8h'),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
        // RABBITMQ_URL opcional: si no está configurado, el módulo RabbitMQ arranca
        // con fallback a localhost y reintenta la conexión sin bloquear el bootstrap.
        RABBITMQ_URL: Joi.string().default('amqp://localhost:5672'),
        // FIELD_ENCRYPTION_KEY: clave para cifrado AES-256-GCM de campos PHI.
        // Opcional en desarrollo; en producción (Azure App Service) debe configurarse
        // como Application Setting para cumplir Ley 1581/2012 y HIPAA.
        // Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
        FIELD_ENCRYPTION_KEY: Joi.string().min(32).optional(),
        FIELD_ENCRYPTION_SALT: Joi.string().optional(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
})
export class ConfigModuleCustom {}

// Daniel Useche
