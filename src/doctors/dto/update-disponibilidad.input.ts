import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsDate, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class UpdateDisponibilidadInput {
  @IsInt()
  @Field(() => Int, { description: 'ID del registro de disponibilidad' })
  id: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field({ nullable: true })
  horaInicio?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Field({ nullable: true })
  horaFin?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true })
  duracionCita?: number;

  @IsOptional()
  @IsBoolean()
  @Field({ nullable: true })
  activo?: boolean;
}
