import { PartialType } from '@nestjs/mapped-types';
import { IsInt } from 'class-validator';
import { CreateTurnDto } from './create-turn.dto';

export class UpdateTurnDto extends PartialType(CreateTurnDto) {
  @IsInt()
  id: number;
}
