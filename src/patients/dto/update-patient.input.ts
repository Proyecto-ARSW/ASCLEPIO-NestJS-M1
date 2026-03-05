import { CreatePatientInput } from './create-patient.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdatePatientInput extends PartialType(CreatePatientInput) {
  @Field(() => Int)
  id: number;
}
