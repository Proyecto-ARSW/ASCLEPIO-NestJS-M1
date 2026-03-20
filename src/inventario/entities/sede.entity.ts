import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType({ description: 'Sede / sucursal del hospital' })
export class Sede {
  @Field(() => Int, { description: 'ID de la sede' })
  id: number;

  @Field({ description: 'Nombre de la sede' })
  nombre: string;

  @Field({ nullable: true, description: 'Dirección física' })
  direccion?: string;

  @Field({ nullable: true, description: 'Ciudad donde se ubica la sede' })
  ciudad?: string;
}
