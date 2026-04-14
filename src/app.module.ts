import { Module } from '@nestjs/common';
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
import { TriageModule } from './triage/triage.module';

@Module({
  imports: [
    ConfigModuleCustom,
    RabbitmqModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    TurnModule,
    HospitalsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
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
        transport: {
          target: 'pino-pretty',
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
    TriageModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
