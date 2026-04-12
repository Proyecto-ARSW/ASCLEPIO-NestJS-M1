import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO para que el usuario autenticado actualice su propio perfil.
 * Solo permite campos de contacto (nombre, apellido, teléfono).
 * No incluye email, password ni rol — esos requieren ADMIN.
 */
@InputType({
  description:
    'Datos para actualizar el perfil propio (nombre, apellido, teléfono)',
})
export class UpdateMyProfileInput {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field({ nullable: true, description: 'Nombre del usuario' })
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field({ nullable: true, description: 'Apellido del usuario' })
  apellido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Field({ nullable: true, description: 'Teléfono de contacto' })
  telefono?: string;
}

// Daniel Useche
