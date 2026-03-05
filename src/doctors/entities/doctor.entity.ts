import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Doctor {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
