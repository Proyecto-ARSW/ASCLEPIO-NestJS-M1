import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { CreateDoctorInput } from './create-doctor.input';

@InputType({
  description:
    'Datos para actualizar un médico existente. Todos los campos son opcionales excepto el ID',
})
export class UpdateDoctorInput extends PartialType(CreateDoctorInput) {
  @Field(() => ID, {
    description: 'Identificador único del médico a actualizar',
  })
  id: string;
}
