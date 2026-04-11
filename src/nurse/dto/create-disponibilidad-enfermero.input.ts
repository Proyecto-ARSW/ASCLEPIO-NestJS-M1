import { InputType, Field, Int, ID } from '@nestjs/graphql';
import { IsUUID, IsInt, IsString, Min, Max } from 'class-validator';

@InputType({
  description: 'Datos para crear un bloque de disponibilidad de enfermero',
})
export class CreateDisponibilidadEnfermeroInput {
  @IsUUID()
  @Field(() => ID, { description: 'ID del enfermero' })
  enfermeroId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  @Field(() => Int, { description: 'Día de semana (0=Domingo, 6=Sábado)' })
  diaSemana: number;

  @IsString()
  @Field({ description: 'Hora de inicio en formato HH:MM (ej. "08:00")' })
  horaInicio: string;

  @IsString()
  @Field({ description: 'Hora de fin en formato HH:MM (ej. "12:00")' })
  horaFin: string;
}
