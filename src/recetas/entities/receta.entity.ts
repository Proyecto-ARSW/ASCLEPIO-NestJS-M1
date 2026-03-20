import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType({ description: 'Receta médica vinculada a un historial clínico' })
export class Receta {
  @Field(() => Int, { description: 'ID de la receta' })
  id: number;

  @Field(() => ID, { description: 'ID del historial médico al que pertenece' })
  historialId: string;

  @Field(() => Int, { description: 'ID del medicamento recetado' })
  medicamentoId: number;

  @Field({ nullable: true, description: 'Dosis indicada (ej. "500mg")' })
  dosis?: string;

  @Field({ nullable: true, description: 'Frecuencia de administración (ej. "Cada 8 horas")' })
  frecuencia?: string;

  @Field(() => Int, { nullable: true, description: 'Duración del tratamiento en días' })
  duracionDias?: number;

  @Field({ nullable: true, description: 'Observaciones o instrucciones especiales' })
  observaciones?: string;
}
