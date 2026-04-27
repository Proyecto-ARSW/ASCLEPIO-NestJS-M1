import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SyncController } from './sync.controller';
import { PrismaService } from '../shared/prisma/prisma.service';
import { ApiKeyGuard } from '../triage-webhook/guards/api-key.guard';

@Module({
  imports: [ConfigModule],
  controllers: [SyncController],
  providers: [PrismaService, ApiKeyGuard],
})
export class SyncModule {}