import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

@InputType({ description: 'Datos específicos del perfil de médico' })
export class CreateMedicoDataInput {
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID de la especialidad médica' })
  especialidadId: number;

  @IsString()
  @MaxLength(50)
  @Field({ description: 'Número de registro médico único' })
  numeroRegistro: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Field({
    nullable: true,
    description: 'Número o nombre del consultorio (opcional)',
  })
  consultorio?: string;
}
