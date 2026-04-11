import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { CreateCategoriaInput } from './create-categoria.input';

@InputType({
  description: 'Datos para actualizar una categoría de medicamento',
})
export class UpdateCategoriaInput extends PartialType(CreateCategoriaInput) {
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID de la categoría a actualizar' })
  id: number;
}
