import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsOptional, IsString } from 'class-validator';

@InputType({ description: 'Datos para actualizar un registro del historial médico' })
export class UpdateHistorialInput {
  @IsUUID()
  @Field(() => ID, { description: 'ID del historial a actualizar' })
  id: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Diagnóstico actualizado' })
  diagnostico?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Tratamiento actualizado' })
  tratamiento?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Observaciones actualizadas' })
  observaciones?: string;
}
