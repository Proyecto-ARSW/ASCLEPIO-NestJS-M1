import { CreateMedicineInput } from './create-medicine.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateMedicineInput extends PartialType(CreateMedicineInput) {
  @Field(() => Int)
  id: number;
}
