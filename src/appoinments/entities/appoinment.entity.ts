import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Appoinment {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
