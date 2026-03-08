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
   * Solo aplica cuando se usa junto con `diaSemana`.
   * Si no se provee, se asigna el primer slot libre del día.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'hora debe tener formato HH:MM (ej. "09:00")' })
  @Field({
    nullable: true,
    description: 'Hora exacta del slot en formato HH:MM (ej. "09:00"). Requiere diaSemana.',
  })
  hora?: string;

  /**
   * Fecha y hora exacta del slot (obtenida de `availableSlots`).
   * Si se provee, tiene prioridad sobre diaSemana + hora.
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field({
    nullable: true,
    description: 'Fecha y hora exacta del slot ISO (prioridad sobre diaSemana/hora)',
  })
  fechaHora?: Date;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  motivo?: string;
}
