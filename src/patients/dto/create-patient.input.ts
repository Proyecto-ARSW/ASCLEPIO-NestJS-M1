import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreatePatientInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
