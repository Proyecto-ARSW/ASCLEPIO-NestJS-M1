import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class SlotDisponible {
  @Field()
  fechaHora: Date;

  @Field(() => Int)
  duracionMinutos: number;
}
