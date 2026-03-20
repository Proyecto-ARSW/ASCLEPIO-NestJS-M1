import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * NOTA SOBRE EL TRIGGER:
 * Los campos `disponibilidad` y `actualizado_en` son calculados automáticamente
 * por el trigger `trg_disponibilidad_medicamento` en PostgreSQL:
 *   - stock_actual = 0              → AGOTADO
 *   - stock_actual ≤ stock_minimo   → STOCK_BAJO
 *   - stock_actual > stock_minimo   → DISPONIBLE
 * No deben enviarse en el input.
 */
@InputType({ description: 'Datos para registrar un medicamento en el inventario de una sede' })
export class CreateInventarioInput {
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID del medicamento' })
  medicamentoId: number;

  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID de la sede' })
  sedeId: number;

  @IsInt()
  @Min(0)
  @Field(() => Int, { defaultValue: 0, description: 'Stock actual (default: 0)' })
  stockActual: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Field(() => Int, { nullable: true, defaultValue: 10, description: 'Stock mínimo (default: 10)' })
  stockMinimo?: number;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Precio del medicamento en esta sede (ej. "15000.50")' })
  precio?: string;
}
