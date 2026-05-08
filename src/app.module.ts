import { Module } from '@nestjs/common';
import { ConfigModuleCustom } from './conf/config.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { join } from 'node:path';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppoinmentsModule } from './appoinments/appoinments.module';
import { MetricsModule } from './metrics/metrics.module';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TurnModule } from './turn/turn.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { NurseModule } from './nurse/nurse.module';
import { MedicinesModule } from './medicines/medicines.module';
import { InventarioModule } from './inventario/inventario.module';
import { HistorialModule } from './historial/historial.module';
import { RecetasModule } from './recetas/recetas.module';
import { ConsentimientosModule } from './consentimientos/consentimientos.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { EncryptionModule } from './shared/encryption/encryption.module';
import type { Request } from 'express';
import { TriageWebhookModule } from './triage-webhook/triage-webhook.module';
import { SyncModule } from './sync/sync.module';

const isProduction = process.env.NODE_ENV === 'production';
import { AppCacheModule } from './shared/cache/app-cache.module';

@Module({
  imports: [
    ConfigModuleCustom,
    EncryptionModule,
    AppCacheModule,
    RabbitmqModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    TurnModule,
    HospitalsModule,
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      autoSchemaFile:
        process.env.NODE_ENV === 'production'
          ? true
          : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: (request, reply) => ({ req: request, res: reply }),
      graphiql: true,
      subscription: true,
    }),
    PatientsModule,
    DoctorsModule,
    AppoinmentsModule,
    MetricsModule,
    LoggerModule.forRoot({
      pinoHttp: {
        // pino-pretty solo en desarrollo: formatea logs de forma legible para el
        // desarrollador. En producción se omite para emitir JSON estructurado puro,
        // que Azure Monitor / Application Insights pueden ingestar directamente.
        transport: isProduction ? undefined : { target: 'pino-pretty' },
        // En producción, nivel info es suficiente. debug añade demasiado ruido.
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        autoLogging: {
          ignore: (req) => {
            const url = req.url ?? '';
            return url.startsWith('/health') || url.startsWith('/metrics');
          },
        },
      },
    }),
    HealthModule,
    NurseModule,
    MedicinesModule,
    InventarioModule,
    HistorialModule,
    RecetasModule,
    ConsentimientosModule,
    TriageWebhookModule,
    SyncModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

// Daniel Useche
