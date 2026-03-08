import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RolUsuario } from '../enums/rol-usuario.enum';
import { CreateMedicoDataInput } from './create-medico-data.input';
import { CreatePacienteDataInput } from './create-paciente-data.input';

@InputType({ description: 'Datos para registrar un nuevo usuario' })
export class CreateUserInput {
  @IsString()
  @Field({ description: 'Nombre del usuario' })
  nombre: string;

  @IsString()
  @Field({ description: 'Apellido del usuario' })
  apellido: string;

  @IsEmail()
  @Field({ description: 'Correo electrónico único' })
  email: string;

  @IsString()
  @MinLength(6)
  @Field({ description: 'Contraseña del usuario' })
  password: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Teléfono de contacto (opcional)' })
  telefono?: string;

  @IsOptional()
  @IsEnum(RolUsuario)
  @Field(() => RolUsuario, {
    nullable: true,
    description: 'Rol del usuario. Por defecto: PACIENTE',
  })
  rol?: RolUsuario;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMedicoDataInput)
  @Field(() => CreateMedicoDataInput, {
    nullable: true,
    description: 'Datos del perfil médico. Requerido cuando rol es MEDICO',
  })
  medicoData?: CreateMedicoDataInput;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePacienteDataInput)
  @Field(() => CreatePacienteDataInput, {
    nullable: true,
    description: 'Datos del perfil de paciente. Opcional cuando rol es PACIENTE',
  })
  pacienteData?: CreatePacienteDataInput;
}
