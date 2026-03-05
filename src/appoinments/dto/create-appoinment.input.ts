import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateAppoinmentInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
