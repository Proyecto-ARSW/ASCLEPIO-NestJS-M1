import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { CreateDisponibilidadEnfermeroInput } from './create-disponibilidad-enfermero.input';

@InputType({
  description: 'Datos para actualizar un bloque de disponibilidad de enfermero',
})
export class UpdateDisponibilidadEnfermeroInput extends PartialType(
  CreateDisponibilidadEnfermeroInput,
) {
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID del bloque de disponibilidad' })
  id: number;
}
