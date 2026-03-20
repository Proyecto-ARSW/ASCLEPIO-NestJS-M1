import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';
import { CreateNurseInput } from './create-nurse.input';

@InputType({ description: 'Datos para actualizar el perfil de un enfermero' })
export class UpdateNurseInput extends PartialType(CreateNurseInput) {
  @IsUUID()
  @Field(() => ID, { description: 'ID del enfermero a actualizar' })
  id: string;
}
