import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType({ description: 'Notificación persistente para un usuario del sistema' })
export class Notificacion {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { description: 'ID del usuario destinatario' })
  usuarioId: string;

  @Field()
  titulo: string;

  @Field()
  mensaje: string;

  /**
   * Tipos posibles:
   * SLOT_DISPONIBLE | REAGENDADO_REQUERIDO | CITA_CANCELADA |
   * CITA_MOVIDA | CITA_CONFIRMADA | SISTEMA
   */
  @Field({ description: 'Categoría de la notificación' })
  tipo: string;

  @Field({ description: 'Si el usuario ya la leyó' })
  leida: boolean;

  @Field(() => ID, {
    nullable: true,
    description: 'ID de la entidad referenciada (cita, turno, etc.)',
  })
  referenciaId?: string;

  @Field()
  creadoEn: Date;
}
