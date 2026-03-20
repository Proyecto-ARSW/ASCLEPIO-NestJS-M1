import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, MaxLength } from 'class-validator';

@InputType({ description: 'Datos para crear una sede' })
export class CreateSedeInput {
  @IsString()
  @MaxLength(150)
  @Field({ description: 'Nombre de la sede (máx. 150 caracteres)' })
  nombre: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true, description: 'Dirección física de la sede' })
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Field({ nullable: true, description: 'Ciudad de la sede' })
  ciudad?: string;
}
