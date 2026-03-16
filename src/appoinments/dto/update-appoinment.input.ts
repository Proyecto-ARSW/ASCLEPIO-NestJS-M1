import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsOptional, IsString } from 'class-validator';

/** Actualización genérica de notas del médico o confirmación de cita */
@InputType()
export class UpdateAppoinmentInput {
  @IsUUID()
  @Field(() => ID)
  id: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  notasMedico?: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  motivo?: string;
}
