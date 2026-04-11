import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { TipoTurno } from '../entities/turn.entity';

@InputType({ description: 'Datos para registrar un nuevo turno en la cola' })
export class CreateTurnInput {
  @IsUUID()
  @Field(() => ID, { description: 'ID del paciente que solicita el turno' })
  pacienteId: string;

  @IsInt()
  @Min(1)
  @Field(() => Int, {
    description: 'ID del hospital donde se solicita el turno',
  })
  hospitalId: number;

  @IsOptional()
  @IsUUID()
  @Field(() => ID, {
    nullable: true,
    description:
      'ID del médico específico (opcional). Si no se provee, se asigna por especialidad.',
  })
  medicoId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, {
    nullable: true,
    description: 'ID de la especialidad requerida (opcional)',
  })
  especialidadId?: number;

  @IsOptional()
  @IsEnum(TipoTurno)
  @Field(() => TipoTurno, {
    nullable: true,
    defaultValue: TipoTurno.NORMAL,
    description:
      'Tipo de turno: NORMAL, PRIORITARIO o URGENTE. Por defecto: NORMAL.',
  })
  tipo?: TipoTurno;
}
