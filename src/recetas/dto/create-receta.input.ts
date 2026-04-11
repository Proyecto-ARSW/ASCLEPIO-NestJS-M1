import { InputType, Field, Int, ID } from '@nestjs/graphql';
import {
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

@InputType({ description: 'Datos para crear una receta médica' })
export class CreateRecetaInput {
  @IsUUID()
  @Field(() => ID, {
    description: 'ID del historial médico al que se asocia la receta',
  })
  historialId: string;

  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID del medicamento recetado' })
  medicamentoId: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field({ nullable: true, description: 'Dosis (ej. "500mg")' })
  dosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field({ nullable: true, description: 'Frecuencia (ej. "Cada 8 horas")' })
  frecuencia?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, {
    nullable: true,
    description: 'Duración del tratamiento en días',
  })
  duracionDias?: number;

  @IsOptional()
  @IsString()
  @Field({
    nullable: true,
    description: 'Observaciones o instrucciones especiales',
  })
  observaciones?: string;
}
