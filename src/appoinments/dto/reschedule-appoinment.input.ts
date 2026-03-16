import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class RescheduleAppoinmentInput {
  /** ID de la cita que necesita reagendamiento (estado POSPUESTA) */
  @IsUUID()
  @Field(() => ID)
  citaId: string;

  /** Nueva fecha/hora elegida por el paciente (debe ser slot disponible) */
  @IsDate()
  @Type(() => Date)
  @Field()
  nuevaFechaHora: Date;
}
