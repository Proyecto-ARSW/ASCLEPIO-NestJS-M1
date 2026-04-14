import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType({
  description: 'Consentimiento informado registrado para un paciente',
})
export class ConsentimientoPaciente {
  @Field(() => Int, { description: 'ID del consentimiento' })
  id: number;

  @Field(() => ID, {
    description: 'ID del paciente al que pertenece el consentimiento',
  })
  pacienteId: string;

  @Field({
    description:
      'Tipo de consentimiento (ej. "Cirugía", "Anestesia", "Tratamiento")',
  })
  tipoConsentimiento: string;

  @Field({ description: '¿El paciente otorgó el consentimiento?' })
  consentimientoOtorgado: boolean;

  @Field({ description: 'Fecha y hora en que se registró el consentimiento' })
  fechaConsentimiento: Date;

  @Field({ description: '¿El consentimiento fue revocado?' })
  revocado: boolean;

  @Field({
    nullable: true,
    description: 'Fecha y hora de revocación (si aplica)',
  })
  fechaRevocacion?: Date;

  @Field({
    nullable: true,
    description: 'Ruta o URL del documento firmado (si aplica)',
  })
  documentoFirmado?: string;
}
