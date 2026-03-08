import { registerEnumType } from '@nestjs/graphql';

export enum EstadoCita {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  CANCELADA = 'CANCELADA',
  POSPUESTA = 'POSPUESTA',
  COMPLETADA = 'COMPLETADA',
}

registerEnumType(EstadoCita, {
  name: 'EstadoCita',
  description: 'Estado actual de una cita médica',
});
