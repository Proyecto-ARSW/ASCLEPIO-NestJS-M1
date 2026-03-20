import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType({ description: 'Registro de historial médico vinculado a un paciente y médico' })
export class HistorialMedico {
  @Field(() => ID, { description: 'ID único del historial (UUID)' })
  id: string;

  @Field(() => ID, { description: 'ID del paciente' })
  pacienteId: string;

  @Field(() => ID, { nullable: true, description: 'ID de la cita médica asociada (opcional)' })
  citaId?: string;

  @Field(() => ID, { description: 'ID del médico que generó el registro' })
  medicoId: string;

  @Field({ nullable: true, description: 'Diagnóstico registrado' })
  diagnostico?: string;

  @Field({ nullable: true, description: 'Tratamiento indicado' })
  tratamiento?: string;

  @Field({ nullable: true, description: 'Observaciones adicionales del médico' })
  observaciones?: string;

  @Field({ description: 'Fecha de creación del registro' })
  creadoEn: Date;
}
