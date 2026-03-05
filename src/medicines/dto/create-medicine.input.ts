import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateMedicineInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
