import { Module } from '@nestjs/common';
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



@Module({
  imports: [ConfigModuleCustom, AuthModule, UsersModule,
     GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      context: ({ req }) => ({ req }),
      playground:false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    }),
     PatientsModule,
     DoctorsModule,
     AppoinmentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
