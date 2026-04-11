import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RolUsuario } from '../enums/rol-usuario.enum';
import { CreateMedicoDataInput } from './create-medico-data.input';
import { CreatePacienteDataInput } from './create-paciente-data.input';
import { CreateEnfermeroDataInput } from './create-enfermero-data.input';

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
  @IsInt()
  @Min(1)
  @Field(() => Int, {
    nullable: true,
    description: 'ID del hospital al que se vincula el usuario. Recomendado.',
  })
  hospitalId?: number;

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
    description:
      'Datos del perfil de paciente. Opcional cuando rol es PACIENTE',
  })
  pacienteData?: CreatePacienteDataInput;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEnfermeroDataInput)
  @Field(() => CreateEnfermeroDataInput, {
    nullable: true,
    description:
      'Datos del perfil de enfermero. Requerido cuando rol es ENFERMERO',
  })
  enfermeroData?: CreateEnfermeroDataInput;
}
