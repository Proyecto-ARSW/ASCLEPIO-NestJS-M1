import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsUUID,
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';

@InputType({
  description: 'Datos para registrar un consentimiento de paciente',
})
export class CreateConsentimientoInput {
  @IsUUID()
  @Field(() => ID, { description: 'ID del paciente' })
  pacienteId: string;

  @IsString()
  @MaxLength(100)
  @Field({ description: 'Tipo de consentimiento (máx. 100 caracteres)' })
  tipoConsentimiento: string;

  @IsBoolean()
  @Field({ description: '¿El paciente otorga el consentimiento?' })
  consentimientoOtorgado: boolean;

  @IsOptional()
  @IsString()
  @Field({
    nullable: true,
    description: 'Ruta o URL del documento firmado (opcional)',
  })
  documentoFirmado?: string;
}
