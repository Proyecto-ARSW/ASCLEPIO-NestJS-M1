import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class ConfirmSlotInput {
  /** ID de la notificación de tipo SLOT_DISPONIBLE recibida */
  @IsUUID()
  @Field(() => ID)
  notificacionId: string;

  /** ID del paciente que confirma (validación de seguridad) */
  @IsUUID()
  @Field(() => ID)
  pacienteId: string;
}
