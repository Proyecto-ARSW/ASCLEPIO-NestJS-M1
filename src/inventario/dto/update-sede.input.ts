import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { CreateSedeInput } from './create-sede.input';

@InputType({ description: 'Datos para actualizar una sede' })
export class UpdateSedeInput extends PartialType(CreateSedeInput) {
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID de la sede a actualizar' })
  id: number;
}
