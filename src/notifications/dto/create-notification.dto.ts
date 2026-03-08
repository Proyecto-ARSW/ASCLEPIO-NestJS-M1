import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsString, IsOptional } from 'class-validator';

@InputType()
export class CreateNotificacionInput {
  @IsUUID()
  @Field(() => ID)
  usuarioId: string;

  @IsString()
  @Field()
  titulo: string;

  @IsString()
  @Field()
  mensaje: string;

  @IsString()
  @Field({ defaultValue: 'SISTEMA' })
  tipo: string;

  @IsOptional()
  @IsUUID()
  @Field(() => ID, { nullable: true })
  referenciaId?: string;
}
