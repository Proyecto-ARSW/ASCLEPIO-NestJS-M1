import { InputType, Field, ID } from '@nestjs/graphql';
import { IsEnum, IsUUID } from 'class-validator';
import { EstadoTurno } from '../entities/turn.entity';

@InputType({ description: 'Datos para actualizar el estado de un turno' })
export class UpdateTurnInput {
  @IsUUID()
  @Field(() => ID, { description: 'ID del turno a actualizar' })
  id: string;

  @IsEnum(EstadoTurno)
  @Field(() => EstadoTurno, { description: 'Nuevo estado del turno' })
  estado: EstadoTurno;
}
