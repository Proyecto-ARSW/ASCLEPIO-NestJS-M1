import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({ description: 'Medicamento del catálogo' })
export class Medicine {
  @Field(() => Int, { description: 'ID del medicamento' })
  id: number;

  @Field({ description: 'Nombre comercial del medicamento' })
  nombreComercial: string;

  @Field({ nullable: true, description: 'Nombre genérico (principio activo)' })
  nombreGenerico?: string;

  @Field(() => Int, { nullable: true, description: 'ID de la categoría' })
  categoriaId?: number;

  @Field({ nullable: true, description: 'Descripción general' })
  descripcion?: string;

  @Field({ nullable: true, description: 'Indicaciones terapéuticas' })
  indicaciones?: string;

  @Field({ nullable: true, description: 'Contraindicaciones' })
  contraindicaciones?: string;

  @Field({ nullable: true, description: 'Presentación (tabletas, jarabe, etc.)' })
  presentacion?: string;

  @Field({ description: '¿Requiere receta médica?' })
  requiereReceta: boolean;

  @Field({ description: 'Estado activo del medicamento' })
  activo: boolean;

  @Field({ description: 'Fecha de creación' })
  creadoEn: Date;
}
