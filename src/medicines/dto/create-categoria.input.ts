import { InputType, Field } from '@nestjs/graphql';
import { IsString, MaxLength } from 'class-validator';

@InputType({ description: 'Datos para crear una categoría de medicamento' })
export class CreateCategoriaInput {
  @IsString()
  @MaxLength(100)
  @Field({ description: 'Nombre único de la categoría (máx. 100 caracteres)' })
  nombre: string;
}
