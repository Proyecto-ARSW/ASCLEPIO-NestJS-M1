import { InputType, Field } from '@nestjs/graphql';

@InputType({ description: 'Datos específicos del perfil de paciente' })
export class CreatePacienteDataInput {
  @Field({  description: 'Fecha de nacimiento del paciente' })
  fechaNacimiento?: Date;

  @Field({  description: 'Tipo de sangre (ej. O+, A-, B+)' })
  tipoSangre?: string;

  @Field({  description: 'Número de documento de identidad' })
  numeroDocumento?: string;

  @Field({  description: 'Tipo de documento (CC, TI, CE, etc.). Por defecto: CC' })
  tipoDocumento?: string;

  @Field({ nullable: true, description: 'EPS o aseguradora del paciente' })
  eps?: string;

  @Field({ nullable: true, description: 'Alergias conocidas del paciente' })
  alergias?: string;

  @Field({ nullable: true, description: 'Antecedentes médicos relevantes' })
  antecedentes?: string;
}
