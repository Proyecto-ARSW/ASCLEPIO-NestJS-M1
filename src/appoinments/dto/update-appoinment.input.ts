import { CreateAppoinmentInput } from './create-appoinment.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateAppoinmentInput extends PartialType(CreateAppoinmentInput) {
  @Field(() => Int)
  id: number;
}
