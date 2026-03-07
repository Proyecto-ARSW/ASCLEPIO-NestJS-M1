import { InputType, Field } from '@nestjs/graphql';
import { RolUsuario } from '../enums/rol-usuario.enum';
import { CreateMedicoDataInput } from './create-medico-data.input';
import { CreatePacienteDataInput } from './create-paciente-data.input';

@InputType({ description: 'Datos para registrar un nuevo usuario' })
export class CreateUserInput {
  @Field({ description: 'Nombre del usuario' })
  nombre: string;

  @Field({ description: 'Apellido del usuario' })
  apellido: string;

  @Field({ description: 'Correo electrónico único' })
  email: string;

  @Field({ description: 'Contraseña del usuario' })
  password: string;

  @Field({ nullable: true, description: 'Teléfono de contacto (opcional)' })
  telefono?: string;

  @Field(() => RolUsuario, {
    nullable: true,
    description: 'Rol del usuario. Por defecto: PACIENTE',
  })
  rol?: RolUsuario;

  @Field(() => CreateMedicoDataInput, {
    nullable: true,
    description: 'Datos del perfil médico. Requerido cuando rol es MEDICO',
  })
  medicoData?: CreateMedicoDataInput;

  @Field(() => CreatePacienteDataInput, {
    nullable: true,
    description: 'Datos del perfil de paciente. Opcional cuando rol es PACIENTE',
  })
  pacienteData?: CreatePacienteDataInput;
}
