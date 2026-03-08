import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsUUID, IsInt, IsDate, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateDisponibilidadInput {
  @IsUUID()
  @Field(() => ID, { description: 'ID del médico' })
  medicoId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  @Field(() => Int, { description: '0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb' })
  diaSemana: number;

  @IsDate()
  @Type(() => Date)
  @Field({ description: 'Hora de inicio del bloque (solo se usa la porción HH:MM)' })
  horaInicio: Date;

  @IsDate()
  @Type(() => Date)
  @Field({ description: 'Hora de fin del bloque (solo se usa la porción HH:MM)' })
  horaFin: Date;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Field(() => Int, { defaultValue: 30, description: 'Duración de cada cita en minutos' })
  duracionCita: number;
}
