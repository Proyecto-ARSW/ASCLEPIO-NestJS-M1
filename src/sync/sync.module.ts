import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { PrismaService } from '../shared/prisma/prisma.service';
import { ApiKeyGuard } from '../triage-webhook/guards/api-key.guard';

@Module({
  imports: [ConfigModule],
  controllers: [SyncController],
  providers: [SyncService, PrismaService, ApiKeyGuard],
})
export class SyncModule {}