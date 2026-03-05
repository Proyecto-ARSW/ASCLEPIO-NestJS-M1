import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateDoctorInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
