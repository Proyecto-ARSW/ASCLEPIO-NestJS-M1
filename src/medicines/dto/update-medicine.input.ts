import { CreateMedicineInput } from './create-medicine.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt } from 'class-validator';

@InputType()
export class UpdateMedicineInput extends PartialType(CreateMedicineInput) {
  @IsInt()
  @Field(() => Int)
  id: number;
}
