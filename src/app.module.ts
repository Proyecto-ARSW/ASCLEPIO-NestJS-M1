import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModuleCustom } from './conf/config.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
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
import { AppThrottlerGuard } from './shared/guards/app-throttler.guard';
import { EncryptionModule } from './shared/encryption/encryption.module';

@Module({
  imports: [
    ConfigModuleCustom,
    /**
     * ThrottlerModule limita la cantidad de requests por IP en una ventana de tiempo.
     * Se definen dos perfiles:
     * - "default": 100 req/min — tráfico normal de la app
     * - "auth": 10 req/15min — endpoints de login/register para frenar brute-force
     * El ThrottlerGuard registrado como APP_GUARD aplica el perfil "default" a
     * todos los endpoints; los endpoints críticos sobreescriben con @Throttle({ auth: ... })
     */
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 500,
      },
      {
        name: 'auth',
        ttl: 60_000,
        limit: 100,
      },
    ]),
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
      context: ({ req }) => ({ req }),
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
