import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

@InputType({
  description: 'Datos para registrar un médico junto con su usuario',
})
export class RegisterDoctorInput {
  // --- Datos del usuario ---
  @IsString()
  @Field({ description: 'Nombre del médico' })
  nombre: string;

  @IsString()
  @Field({ description: 'Apellido del médico' })
  apellido: string;

  @IsEmail()
  @Field({ description: 'Correo electrónico (único)' })
  email: string;

  @IsString()
  @MinLength(6)
  @Field({ description: 'Contraseña del usuario' })
  password: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Teléfono de contacto (opcional)' })
  telefono?: string;

  // --- Datos del médico ---
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID de la especialidad médica' })
  especialidadId: number;

  @IsString()
  @MaxLength(50)
  @Field({
    description: 'Número de registro médico único (máx. 50 caracteres)',
  })
  numeroRegistro: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Field({
    nullable: true,
    description:
      'Número o nombre del consultorio (opcional, máx. 20 caracteres)',
  })
  consultorio?: string;
}
