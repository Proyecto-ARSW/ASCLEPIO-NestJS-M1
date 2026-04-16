import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Al actualizar stock_actual o stock_minimo, el trigger `trg_disponibilidad_medicamento`
 * recalcula automáticamente el campo `disponibilidad` y registra `actualizado_en`.
 */
@InputType({
  description:
    'Datos para actualizar el inventario de un medicamento en una sede',
})
export class UpdateInventarioInput {
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID del registro de inventario' })
  id: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Field(() => Int, { nullable: true, description: 'Nuevo stock actual' })
  stockActual?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Field(() => Int, { nullable: true, description: 'Nuevo stock mínimo' })
  stockMinimo?: number;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Nuevo precio' })
  precio?: string;
}
