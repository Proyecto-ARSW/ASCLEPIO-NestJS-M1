import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsOptional, IsString } from 'class-validator';

@InputType({
  description: 'Datos para crear un registro en el historial médico',
})
export class CreateHistorialInput {
  @IsUUID()
  @Field(() => ID, { description: 'ID del paciente' })
  pacienteId: string;

  @IsUUID()
  @Field(() => ID, { description: 'ID del médico que crea el registro' })
  medicoId: string;

  @IsUUID()
  @Field(() => ID, {
    description: 'ID de la cita médica que origina este registro (requerido)',
  })
  citaId: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Diagnóstico' })
  diagnostico?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Tratamiento indicado' })
  tratamiento?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Observaciones adicionales' })
  observaciones?: string;
}
// Daniel Useche
