import { InputType, Field, Int, ID } from '@nestjs/graphql';
import {
  IsUUID,
  IsInt,
  IsString,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

@InputType({ description: 'Datos requeridos para registrar un nuevo médico' })
export class CreateDoctorInput {
  @IsUUID()
  @Field(() => ID, {
    description: 'ID del usuario al que se asociará el médico',
  })
  usuarioId: string;

  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID de la especialidad médica' })
  especialidadId: number;

  @IsString()
  @MaxLength(50)
  @Field({
    description: 'Número de registro médico único (máx. 50 caracteres)',
  })
  numeroRegistro: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Field({
    nullable: true,
    description:
      'Número o nombre del consultorio (opcional, máx. 20 caracteres)',
  })
  consultorio?: string;
}
