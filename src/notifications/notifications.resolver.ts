import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  ID,
  Int,
} from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { NotificationsService } from './notifications.service';
import { Notificacion } from './entities/notification.entity';
import { CreateNotificacionInput } from './dto/create-notification.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';

@Resolver(() => Notificacion)
export class NotificationsResolver {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject('NOTIF_PUBSUB') private readonly pubSub: PubSub,
  ) {}

  // ── QUERIES ──────────────────────────────────────────────────────────────────

  /** Lista todas las notificaciones del usuario autenticado */
  @Auth()
  @Query(() => [Notificacion], { name: 'notificaciones' })
  findByUser(@CurrentUser() user: JwtPayload): Promise<Notificacion[]> {
    return this.notificationsService.findByUser(user.sub);
  }

  /** Solo las no leídas del usuario autenticado */
  @Auth()
  @Query(() => [Notificacion], { name: 'notificacionesSinLeer' })
  findUnread(@CurrentUser() user: JwtPayload): Promise<Notificacion[]> {
    return this.notificationsService.findUnread(user.sub);
  }

  /** Conteo de no leídas (para badge en UI) */
  @Auth()
  @Query(() => Int, { name: 'conteoSinLeer' })
  countUnread(@CurrentUser() user: JwtPayload): Promise<number> {
    return this.notificationsService.countUnread(user.sub);
  }

  // ── MUTATIONS ────────────────────────────────────────────────────────────────

  /** Crear notificación manual (admin o sistema) */
  @Auth(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => Notificacion)
  createNotificacion(
    @Args('input') input: CreateNotificacionInput,
  ): Promise<Notificacion> {
    return this.notificationsService.create(input);
  }

  /** Marcar una notificación propia como leída */
  @Auth()
  @Mutation(() => Notificacion)
  marcarNotificacionLeida(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Notificacion> {
    return this.notificationsService.markAsRead(id);
  }

  /** Marcar todas las notificaciones del usuario como leídas */
  @Auth()
  @Mutation(() => Int, {
    description: 'Retorna el número de notificaciones marcadas como leídas',
  })
  marcarTodasLeidas(@CurrentUser() user: JwtPayload): Promise<number> {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  /** Eliminar una notificación */
  @Auth()
  @Mutation(() => Notificacion)
  eliminarNotificacion(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Notificacion> {
    return this.notificationsService.remove(id);
  }

  /** Limpiar todas las notificaciones leídas del usuario */
  @Auth()
  @Mutation(() => Int, {
    description: 'Retorna el número de notificaciones eliminadas',
  })
  limpiarNotificacionesLeidas(
    @CurrentUser() user: JwtPayload,
  ): Promise<number> {
    return this.notificationsService.removeAllRead(user.sub);
  }

  // ── SUBSCRIPTION ─────────────────────────────────────────────────────────────

  /**
   * Canal en tiempo real de nuevas notificaciones para el usuario autenticado.
   * Emite automáticamente cuando el sistema crea una notificación para este usuario.
   */
  @Subscription(() => Notificacion, { name: 'nuevaNotificacion' })
  nuevaNotificacion(@Args('usuarioId', { type: () => ID }) usuarioId: string) {
    return this.pubSub.asyncIterableIterator(`NOTIF_${usuarioId}`);
  }
}
