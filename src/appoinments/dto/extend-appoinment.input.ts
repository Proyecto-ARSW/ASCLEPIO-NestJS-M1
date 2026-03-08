import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsUUID, IsInt, Min } from 'class-validator';

@InputType()
export class ExtendAppoinmentInput {
  /** ID de la cita actualmente en consulta */
  @IsUUID()
  @Field(() => ID)
  id: string;

  /** Minutos adicionales que el médico requiere */
  @IsInt()
  @Min(1)
  @Field(() => Int)
  minutosAdicionales: number;
}
