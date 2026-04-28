import { Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { TurnService } from './turn.service';
import { TurnResolver } from './turn.resolver';

@Module({
  providers: [
    TurnResolver,
    TurnService,
    PrismaService,
    {
      provide: 'TURN_PUBSUB',
      useValue: new PubSub(),
    },
    NotificationsService,
    {
      provide: 'NOTIF_PUBSUB',
      useValue: new PubSub(),
    },
  ],
  exports : [TurnService],
})
export class TurnModule {}
