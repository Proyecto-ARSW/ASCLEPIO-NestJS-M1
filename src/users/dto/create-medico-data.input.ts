import { InputType, Field, Int } from '@nestjs/graphql';

@InputType({ description: 'Datos específicos del perfil de médico' })
export class CreateMedicoDataInput {
  @Field(() => Int, { description: 'ID de la especialidad médica' })
  especialidadId: number;

  @Field({ description: 'Número de registro médico único' })
  numeroRegistro: string;

  @Field({ nullable: true, description: 'Número o nombre del consultorio (opcional)' })
  consultorio?: string;
}
