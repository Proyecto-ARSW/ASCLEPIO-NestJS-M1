import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

@InputType({ description: 'Datos para crear un medicamento en el catálogo' })
export class CreateMedicineInput {
  @IsString()
  @MaxLength(150)
  @Field({
    description: 'Nombre comercial del medicamento (máx. 150 caracteres)',
  })
  nombreComercial: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Field({ nullable: true, description: 'Nombre genérico / principio activo' })
  nombreGenerico?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, {
    nullable: true,
    description: 'ID de la categoría de medicamento',
  })
  categoriaId?: number;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Descripción general del medicamento' })
  descripcion?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Indicaciones terapéuticas' })
  indicaciones?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Contraindicaciones del medicamento' })
  contraindicaciones?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field({
    nullable: true,
    description: 'Presentación (tabletas, jarabe, ampolla, etc.)',
  })
  presentacion?: string;

  @IsOptional()
  @IsBoolean()
  @Field({
    nullable: true,
    defaultValue: true,
    description: '¿Requiere receta médica? (default: true)',
  })
  requiereReceta?: boolean;
}
