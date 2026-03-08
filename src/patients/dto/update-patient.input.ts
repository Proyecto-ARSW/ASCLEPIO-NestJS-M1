import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';
import { CreatePatientInput } from './create-patient.input';

@InputType({
  description:
    'Datos para actualizar un paciente existente. Todos los campos son opcionales excepto el ID',
})
export class UpdatePatientInput extends PartialType(CreatePatientInput) {
  @IsUUID()
  @Field(() => ID, {
    description: 'Identificador único del paciente a actualizar',
  })
  id: string;
}
