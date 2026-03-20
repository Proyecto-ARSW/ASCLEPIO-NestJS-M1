import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { CreateRecetaInput } from './create-receta.input';

@InputType({ description: 'Datos para actualizar una receta médica' })
export class UpdateRecetaInput extends PartialType(CreateRecetaInput) {
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID de la receta a actualizar' })
  id: number;
}
