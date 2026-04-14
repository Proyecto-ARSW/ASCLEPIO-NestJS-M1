import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType({ description: 'Representa un paciente registrado en el sistema' })
export class Patient {
  @Field(() => ID, { description: 'Identificador único del paciente (UUID)' })
  id: string;

  @Field(() => ID, { description: 'ID del usuario asociado al paciente' })
  usuarioId: string;

  @Field({ description: 'Nombre del paciente' })
  nombre: string;

  @Field({ description: 'Apellido del paciente' })
  apellido: string;

  @Field({ description: 'Correo electrónico del paciente' })
  email: string;

  @Field({ nullable: true, description: 'Teléfono de contacto' })
  telefono?: string;

  @Field({ nullable: true, description: 'Fecha de nacimiento del paciente' })
  fechaNacimiento?: Date;

  @Field({
    nullable: true,
    description: 'Tipo de sangre del paciente (ej. O+, A-)',
  })
  tipoSangre?: string;

  @Field({ nullable: true, description: 'Número de documento de identidad' })
  numeroDocumento?: string;

  @Field({
    nullable: true,
    description: 'Tipo de documento (CC, TI, CE, etc.)',
  })
  tipoDocumento?: string;

  @Field({ nullable: true, description: 'EPS o aseguradora del paciente' })
  eps?: string;

  @Field({ nullable: true, description: 'Alergias conocidas del paciente' })
  alergias?: string;

  @Field({ nullable: true, description: 'Antecedentes médicos del paciente' })
  antecedentes?: string;

  @Field({ description: 'Fecha de creación del registro' })
  creadoEn: Date;
}
