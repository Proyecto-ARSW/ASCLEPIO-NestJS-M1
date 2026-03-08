import { InputType, Int, Field } from '@nestjs/graphql';
import { IsInt } from 'class-validator';

@InputType()
export class CreateMedicineInput {
  @IsInt()
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
