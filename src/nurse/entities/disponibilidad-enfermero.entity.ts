import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType({ description: 'Bloque de disponibilidad horaria de un enfermero' })
export class DisponibilidadEnfermero {
  @Field(() => Int, { description: 'ID del bloque de disponibilidad' })
  id: number;

  @Field(() => ID, { description: 'ID del enfermero' })
  enfermeroId: string;

  @Field(() => Int, {
    description: 'Día de la semana (0=Domingo, 1=Lunes, …, 6=Sábado)',
  })
  diaSemana: number;

  @Field({ description: 'Hora de inicio del bloque (HH:MM:SS)' })
  horaInicio: string;

  @Field({ description: 'Hora de fin del bloque (HH:MM:SS)' })
  horaFin: string;

  @Field({ description: 'Indica si el bloque está activo' })
  activo: boolean;
}
