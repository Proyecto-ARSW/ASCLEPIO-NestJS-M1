import { InputType, Field, ID, Int } from '@nestjs/graphql';
import {
  IsUUID,
  IsDate,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateAppoinmentInput {
  @IsUUID()
  @Field(() => ID)
  pacienteId: string;

  @IsUUID()
  @Field(() => ID)
  medicoId: string;

  /**
   * ID del bloque de disponibilidad del médico (obtenido de `disponibilidadesByDoctor`).
   * Tiene prioridad sobre `diaSemana`. Si se provee junto con `hora`, filtra el slot exacto;
   * si no, se toma el primer slot libre del bloque.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, {
    nullable: true,
    description:
      'ID del bloque de disponibilidad del médico. Prioridad sobre diaSemana. ' +
      'Combinar con "hora" para elegir un horario exacto dentro del bloque.',
  })
  disponibilidadId?: number;

  /**
   * Día de la semana deseado: 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb.
   * El sistema calcula la próxima fecha que corresponda a ese día.
   * Si no se provee `hora`, se asigna el primer slot libre de ese día.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  @Field(() => Int, {
    nullable: true,
    description: 'Día de la semana: 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb',
  })
  diaSemana?: number;

  /**
   * Hora deseada en formato "HH:MM" (ej. "09:00", "14:30").
   * Aplica con `disponibilidadId` o con `diaSemana`.
   * Si no se provee, se asigna el primer slot libre.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'hora debe tener formato HH:MM (ej. "09:00")',
  })
  @Field({
    nullable: true,
    description:
      'Hora exacta del slot en formato HH:MM (ej. "09:00"). Requiere disponibilidadId o diaSemana.',
  })
  hora?: string;

  /**
   * Fecha y hora exacta del slot (obtenida de `availableSlots`).
   * Si se provee, tiene prioridad sobre disponibilidadId y diaSemana.
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field({
    nullable: true,
    description: 'Fecha y hora exacta del slot ISO (máxima prioridad)',
  })
  fechaHora?: Date;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  motivo?: string;
}
