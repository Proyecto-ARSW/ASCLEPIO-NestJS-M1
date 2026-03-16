import { CreateUserInput } from './create-user.input';
import { InputType, Field, ID, PartialType, OmitType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType({
  description:
    'Datos para actualizar un usuario existente (email y password no son modificables aquí)',
})
export class UpdateUserInput extends PartialType(
  OmitType(CreateUserInput, ['password', 'email'] as const),
) {
  @IsUUID()
  @Field(() => ID, { description: 'ID del usuario a actualizar' })
  id: string;
}
