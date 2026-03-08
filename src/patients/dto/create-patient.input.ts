import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsOptional, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

@InputType({ description: 'Datos requeridos para registrar un nuevo paciente' })
export class CreatePatientInput {
  @IsUUID()
  @Field(() => ID, {
    description: 'ID del usuario al que se asociará el paciente',
  })
  usuarioId: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field({
    nullable: true,
    description: 'Fecha de nacimiento del paciente',
  })
  fechaNacimiento?: Date;

  @IsOptional()
  @IsString()
  @Field({
    nullable: true,
    description: 'Tipo de sangre del paciente (ej. O+, A-, B+)',
  })
  tipoSangre?: string;

  @IsOptional()
  @IsString()
  @Field({
    nullable: true,
    description: 'Número de documento de identidad (máx. 20 caracteres)',
  })
  numeroDocumento?: string;

  @IsOptional()
  @IsString()
  @Field({
    nullable: true,
    description: 'Tipo de documento (CC, TI, CE, etc.). Por defecto: CC',
  })
  tipoDocumento?: string;

  @IsOptional()
  @IsString()
  @Field({
    nullable: true,
    description: 'EPS o aseguradora del paciente (máx. 100 caracteres)',
  })
  eps?: string;

  @IsOptional()
  @IsString()
  @Field({
    nullable: true,
    description: 'Alergias conocidas del paciente',
  })
  alergias?: string;

  @IsOptional()
  @IsString()
  @Field({
    nullable: true,
    description: 'Antecedentes médicos relevantes del paciente',
  })
  antecedentes?: string;
}
