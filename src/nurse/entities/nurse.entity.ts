import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType({ description: 'Perfil de enfermero registrado en el sistema' })
export class Nurse {
  @Field(() => ID, { description: 'ID único del enfermero (UUID)' })
  id: string;

  @Field(() => ID, { description: 'ID del usuario asociado' })
  usuarioId: string;

  @Field({ description: 'Nombre del enfermero' })
  nombre: string;

  @Field({ description: 'Apellido del enfermero' })
  apellido: string;

  @Field({ description: 'Correo electrónico' })
  email: string;

  @Field({ nullable: true, description: 'Teléfono de contacto' })
  telefono?: string;

  @Field({ description: 'Número de registro profesional único' })
  numeroRegistro: string;

  @Field(() => Int, { description: 'ID del nivel de formación (FK formacion)' })
  nivelFormacion: number;

  @Field(() => Int, {
    description: 'ID del área de especialización (FK especialidades)',
  })
  areaEspecializacion: number;

  @Field({ description: '¿Tiene certificación de triage?' })
  certificacionTriage: boolean;

  @Field({ nullable: true, description: 'Fecha de certificación de triage' })
  fechaCertificacion?: Date;

  @Field({ description: 'Estado activo del enfermero' })
  activo: boolean;

  @Field({ description: 'Fecha de creación del registro' })
  creadoEn: Date;
}
