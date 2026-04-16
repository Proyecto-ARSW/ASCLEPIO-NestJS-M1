import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({
  description: 'Categoría de medicamento (Analgésico, Antibiótico, etc.)',
})
export class CategoriaMedicamento {
  @Field(() => Int, { description: 'ID de la categoría' })
  id: number;

  @Field({ description: 'Nombre único de la categoría' })
  nombre: string;
}
