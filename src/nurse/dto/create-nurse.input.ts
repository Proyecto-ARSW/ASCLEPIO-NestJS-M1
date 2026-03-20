import { InputType, Field, Int, ID } from '@nestjs/graphql';
import {
  IsUUID,
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * Vincula un perfil de enfermero a un usuario ya existente.
 * El usuario debe haberse creado previamente vía POST /auth/register con rol ENFERMERO,
 * o crearse manualmente en el módulo Users.
 */
@InputType({ description: 'Datos para crear el perfil de enfermero de un usuario existente' })
export class CreateNurseInput {
  @IsUUID()
  @Field(() => ID, { description: 'ID del usuario al que se asociará el enfermero' })
  usuarioId: string;

  @IsString()
  @MaxLength(50)
  @Field({ description: 'Número de registro profesional único (máx. 50 caracteres)' })
  numeroRegistro: string;

  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID del nivel de formación (FK tabla formacion)' })
  nivelFormacion: number;

  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID del área de especialización (FK tabla especialidades)' })
  areaEspecializacion: number;

  @IsOptional()
  @IsBoolean()
  @Field({ nullable: true, defaultValue: false, description: '¿Tiene certificación de triage?' })
  certificacionTriage?: boolean;

  @IsOptional()
  @Field({ nullable: true, description: 'Fecha de la certificación de triage' })
  fechaCertificacion?: Date;
}
