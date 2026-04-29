import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModuleCustom } from './conf/config.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppoinmentsModule } from './appoinments/appoinments.module';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
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
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AppThrottlerGuard } from './shared/guards/app-throttler.guard';
import { EncryptionModule } from './shared/encryption/encryption.module';
import type { Request } from 'express';
import { TriageModule } from './triage/triage.module';

@Module({
  imports: [
    ConfigModuleCustom,
    /**
     * ThrottlerModule limita la cantidad de requests por IP en una ventana de tiempo.
     * Se definen dos perfiles:
     * - "default": THROTTLE_LIMIT req / THROTTLE_TTL_MS ms por IP (default 200/60s)
     * - "auth": THROTTLE_AUTH_LIMIT req / 15 min — login/register, frena brute-force
     * El ThrottlerGuard registrado como APP_GUARD aplica el perfil "default" a
     * todos los endpoints; los endpoints críticos sobreescriben con @Throttle({ auth: ... })
     */
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ([
        {
          name: 'default',
          ttl: cfg.get<number>('THROTTLE_TTL_MS', 60_000),
          limit: cfg.get<number>('THROTTLE_LIMIT', 200),
        },
        {
          name: 'auth',
          ttl: 900_000,
          limit: cfg.get<number>('THROTTLE_AUTH_LIMIT', 10),
        },
      ]),
    }),
    EncryptionModule,
    RabbitmqModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    TurnModule,
    HospitalsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile:
        process.env.NODE_ENV === 'production'
          ? true
          : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: ({ req }: { req: Request }) => ({ req }),
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      subscriptions: {
        'graphql-ws': true,
      },
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
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        // En producción, nivel info es suficiente. debug añade demasiado ruido.
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      },
    }),
    HealthModule,
    NurseModule,
    MedicinesModule,
    InventarioModule,
    HistorialModule,
    RecetasModule,
    ConsentimientosModule,
    TriageModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}

// Daniel Useche
