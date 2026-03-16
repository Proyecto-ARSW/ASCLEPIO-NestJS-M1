import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType({ description: 'Horario semanal disponible de un médico para recibir citas' })
export class DisponibilidadMedico {
  @Field(() => Int)
  id: number;

  @Field(() => ID)
  medicoId: string;

  /**
   * Día de la semana: 0 = Domingo, 1 = Lunes, … 6 = Sábado
   */
  @Field(() => Int, { description: '0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb' })
  diaSemana: number;

  @Field({ description: 'Hora de inicio en formato HH:MM (ISO time)' })
  horaInicio: Date;

  @Field({ description: 'Hora de fin en formato HH:MM (ISO time)' })
  horaFin: Date;

  @Field(() => Int, { description: 'Duración en minutos de cada cita en este bloque' })
  duracionCita: number;

  @Field({ description: 'Si el bloque está activo y genera slots' })
  activo: boolean;
}
