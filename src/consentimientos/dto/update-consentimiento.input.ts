import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

@InputType({
  description:
    'Datos para actualizar el documento firmado de un consentimiento',
})
export class UpdateConsentimientoInput {
  @IsInt()
  @Min(1)
  @Field(() => Int, { description: 'ID del consentimiento' })
  id: number;

  @IsOptional()
  @IsString()
  @Field({
    nullable: true,
    description: 'Nueva ruta o URL del documento firmado',
  })
  documentoFirmado?: string;
}
