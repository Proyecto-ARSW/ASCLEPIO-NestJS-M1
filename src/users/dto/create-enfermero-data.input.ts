import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType({ description: 'Datos específicos del perfil de enfermero' })
export class CreateEnfermeroDataInput {
  @IsString()
  @MaxLength(50)
  @Field({ description: 'Número de registro profesional único del enfermero' })
  numeroRegistro: string;

  @IsInt()
  @Min(1)
  @Field(() => Int, {
    description: 'ID del nivel de formación (FK a tabla formacion)',
  })
  nivelFormacion: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, {
    nullable: true,
    description:
      'ID del área de especialización (FK a especialidades). Opcional.',
  })
  areaEspecializacion?: number;

  @IsOptional()
  @IsBoolean()
  @Field({
    nullable: true,
    defaultValue: false,
    description: 'Indica si el enfermero tiene certificación de triage',
  })
  certificacionTriage?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field({ nullable: true, description: 'Fecha de certificación de triage' })
  fechaCertificacion?: Date;
}
