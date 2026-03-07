import { InputType, Field, Int, ID } from '@nestjs/graphql';

@InputType({ description: 'Datos requeridos para registrar un nuevo médico' })
export class CreateDoctorInput {
  @Field(() => ID, {
    description: 'ID del usuario al que se asociará el médico',
  })
  usuarioId: string;

  @Field(() => Int, { description: 'ID de la especialidad médica' })
  especialidadId: number;

  @Field({
    description: 'Número de registro médico único (máx. 50 caracteres)',
  })
  numeroRegistro: string;

  @Field({
    nullable: true,
    description:
      'Número o nombre del consultorio (opcional, máx. 20 caracteres)',
  })
  consultorio?: string;
}
