import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Appoinment } from './appoinment.entity';
import { SlotDisponible } from './slot-disponible.entity';

/**
 * Payload emitido en cada suscripción de citas.
 *
 * tipo:
 *  CREADA | CANCELADA | POSPUESTA | EXTENDIDA | MOVIDA |
 *  REAGENDADO_REQUERIDO | SLOT_OFERTADO | CONFIRMADA_SLOT | REAGENDADA
 */
@ObjectType()
export class CitaEvento {
  @Field()
  tipo: string;

  @Field(() => Appoinment)
  cita: Appoinment;

  @Field({ nullable: true })
  mensaje?: string;

  /** Slots sugeridos cuando se requiere reagendamiento */
  @Field(() => [SlotDisponible], { nullable: true })
  slotsDisponibles?: SlotDisponible[];

  /** ID de la notificación de oferta de slot para confirmarla */
  @Field(() => ID, { nullable: true })
  notificacionId?: string;
}
