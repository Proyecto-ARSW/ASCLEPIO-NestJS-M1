import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { CreateMedicineInput } from './create-medicine.input';

@InputType({ description: 'Datos para actualizar un medicamento' })
export class UpdateMedicineInput extends PartialType(CreateMedicineInput) {
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID del medicamento a actualizar' })
  id: number;
}
