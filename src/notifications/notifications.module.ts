import { Global, Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { PrismaService } from 'src/shared/prisma/prisma.service';

/**
 * @Global() permite que NotificationsService y NOTIF_PUBSUB sean
 * inyectables en cualquier módulo sin necesidad de importar NotificationsModule.
 */
@Global()
@Module({
  providers: [
    NotificationsResolver,
    NotificationsService,
    PrismaService,
    {
      provide: 'NOTIF_PUBSUB',
      useValue: new PubSub(),
    },
  ],
  exports: [NotificationsService, 'NOTIF_PUBSUB'],
})
export class NotificationsModule {}
