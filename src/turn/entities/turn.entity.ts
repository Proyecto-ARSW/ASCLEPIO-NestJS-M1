import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';

export enum EstadoTurno {
  EN_ESPERA = 'EN_ESPERA',
  EN_CONSULTA = 'EN_CONSULTA',
  ATENDIDO = 'ATENDIDO',
  CANCELADO = 'CANCELADO',
}

export enum TipoTurno {
  NORMAL = 'NORMAL',
  PRIORITARIO = 'PRIORITARIO',
  URGENTE = 'URGENTE',
}

registerEnumType(EstadoTurno, {
  name: 'EstadoTurno',
  description: 'Estado del turno en la cola de atención',
  valuesMap: {
    EN_ESPERA: { description: 'Turno esperando ser llamado' },
    EN_CONSULTA: { description: 'Turno en atención activa' },
    ATENDIDO: { description: 'Turno completado' },
    CANCELADO: { description: 'Turno cancelado' },
  },
});

registerEnumType(TipoTurno, {
  name: 'TipoTurno',
  description: 'Prioridad del turno',
  valuesMap: {
    NORMAL: { description: 'Turno normal sin prioridad especial' },
    PRIORITARIO: { description: 'Turno con prioridad (adulto mayor, embarazada, etc.)' },
    URGENTE: { description: 'Turno urgente / emergencia' },
  },
});

@ObjectType({ description: 'Turno en la cola de atención de un hospital' })
export class Turno {
  @Field(() => ID, { description: 'Identificador único del turno (UUID)' })
  id: string;

  @Field(() => ID, { description: 'ID del paciente' })
  pacienteId: string;

  @Field(() => ID, { nullable: true, description: 'ID del médico asignado (opcional)' })
  medicoId?: string;

  @Field(() => Int, { nullable: true, description: 'ID de la especialidad requerida' })
  especialidadId?: number;

  @Field(() => Int, { nullable: true, description: 'ID del hospital donde se atiende el turno' })
  hospitalId?: number;

  @Field(() => Int, { description: 'Número de turno asignado en el día' })
  numeroTurno: number;

  @Field(() => TipoTurno, { description: 'Tipo/prioridad del turno' })
  tipo: TipoTurno;

  @Field(() => EstadoTurno, { description: 'Estado actual del turno' })
  estado: EstadoTurno;

  @Field(() => Int, { nullable: true, description: 'Posición en la cola de espera' })
  posicionCola?: number;

  @Field({ nullable: true, description: 'Fecha y hora en que fue llamado' })
  llamadoEn?: Date;

  @Field({ nullable: true, description: 'Fecha y hora en que fue atendido/completado' })
  atendidoEn?: Date;

  @Field({ description: 'Fecha del turno (solo fecha, sin hora)' })
  fecha: Date;

  @Field({ description: 'Fecha y hora de creación del registro' })
  creadoEn: Date;
}

@ObjectType({ description: 'Evento emitido por subscripción de turnos' })
export class TurnoEvento {
  @Field({ description: 'Tipo de evento: CREADO | LLAMADO | EN_CONSULTA | ATENDIDO | CANCELADO' })
  tipo: string;

  @Field(() => Turno, { description: 'Turno afectado' })
  turno: Turno;

  @Field({ nullable: true, description: 'Mensaje adicional para mostrar al paciente' })
  mensaje?: string;
}
