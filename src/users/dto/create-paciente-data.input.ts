import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

@InputType({ description: 'Datos específicos del perfil de paciente' })
export class CreatePacienteDataInput {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field({ nullable: true, description: 'Fecha de nacimiento del paciente' })
  fechaNacimiento?: Date;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Tipo de sangre (ej. O+, A-, B+)' })
  tipoSangre?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Número de documento de identidad' })
  numeroDocumento?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Tipo de documento (CC, TI, CE, etc.). Por defecto: CC' })
  tipoDocumento?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'EPS o aseguradora del paciente' })
  eps?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Alergias conocidas del paciente' })
  alergias?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Antecedentes médicos relevantes' })
  antecedentes?: string;
}
