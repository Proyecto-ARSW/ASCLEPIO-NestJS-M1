import { ObjectType, Field, Int } from '@nestjs/graphql';
import { registerEnumType } from '@nestjs/graphql';

export enum DisponibilidadMedicamento {
  DISPONIBLE = 'DISPONIBLE',
  STOCK_BAJO = 'STOCK_BAJO',
  AGOTADO = 'AGOTADO',
}

registerEnumType(DisponibilidadMedicamento, {
  name: 'DisponibilidadMedicamento',
  description: 'Estado de disponibilidad calculado automáticamente por trigger de BD',
  valuesMap: {
    DISPONIBLE: { description: 'Stock actual > stock mínimo' },
    STOCK_BAJO: { description: 'Stock actual ≤ stock mínimo (pero > 0)' },
    AGOTADO: { description: 'Stock actual = 0' },
  },
});

@ObjectType({ description: 'Registro de inventario de un medicamento en una sede' })
export class InventarioMedicamento {
  @Field(() => Int, { description: 'ID del registro de inventario' })
  id: number;

  @Field(() => Int, { description: 'ID del medicamento' })
  medicamentoId: number;

  @Field(() => Int, { description: 'ID de la sede' })
  sedeId: number;

  @Field(() => Int, { description: 'Stock actual del medicamento en esta sede' })
  stockActual: number;

  @Field(() => Int, {
    description: 'Stock mínimo configurado. Cuando stock_actual ≤ stock_minimo el trigger cambia disponibilidad a STOCK_BAJO',
  })
  stockMinimo: number;

  @Field(() => DisponibilidadMedicamento, {
    description: 'Calculado automáticamente por trigger de BD según stock_actual vs stock_minimo',
  })
  disponibilidad: DisponibilidadMedicamento;

  @Field({ nullable: true, description: 'Precio del medicamento en esta sede' })
  precio?: string;

  @Field({ description: 'Fecha de última actualización (gestionada por trigger)' })
  actualizadoEn: Date;
}
