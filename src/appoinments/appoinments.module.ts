import { Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { AppoinmentsService } from './appoinments.service';
import { AppoinmentsResolver } from './appoinments.resolver';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Module({
  providers: [
    AppoinmentsResolver,
    AppoinmentsService,
    PrismaService,
    {
      provide: 'PUBSUB',
      useValue: new PubSub(),
    },
  ],
})
export class AppoinmentsModule {}
