import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType({ description: 'Representa un médico registrado en el sistema' })
export class Doctor {
  @Field(() => ID, { description: 'Identificador único del médico (UUID)' })
  id: string;

  @Field(() => ID, { description: 'ID del usuario asociado al médico' })
  usuarioId: string;

  @Field({ description: 'Nombre del médico' })
  nombre: string;

  @Field({ description: 'Apellido del médico' })
  apellido: string;

  @Field({ description: 'Correo electrónico del médico' })
  email: string;

  @Field({ nullable: true, description: 'Teléfono de contacto' })
  telefono?: string;

  @Field(() => Int, { description: 'ID de la especialidad médica' })
  especialidadId: number;

  @Field({ description: 'Número de registro médico único' })
  numeroRegistro: string;

  @Field({
    nullable: true,
    description: 'Número o nombre del consultorio asignado',
  })
  consultorio?: string;

  @Field({ description: 'Indica si el médico está activo en el sistema' })
  activo: boolean;

  @Field({ description: 'Fecha de creación del registro' })
  creadoEn: Date;
}
