import { Module } from '@nestjs/common';
import { TurnService } from './turn.service';
import { TurnGateway } from './turn.gateway';

@Module({
  providers: [TurnGateway, TurnService],
})
export class TurnModule {}
