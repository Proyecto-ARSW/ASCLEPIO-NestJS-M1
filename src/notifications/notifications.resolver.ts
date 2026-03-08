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

@Resolver(() => Notificacion)
export class NotificationsResolver {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject('NOTIF_PUBSUB') private readonly pubSub: PubSub,
  ) {}

  // ── QUERIES ──────────────────────────────────────────────────────────────────

  /** Lista todas las notificaciones de un usuario (leídas y no leídas) */
  @Query(() => [Notificacion], { name: 'notificaciones' })
  findByUser(
    @Args('usuarioId', { type: () => ID }) usuarioId: string,
  ): Promise<Notificacion[]> {
    return this.notificationsService.findByUser(usuarioId);
  }

  /** Lista solo las notificaciones no leídas de un usuario */
  @Query(() => [Notificacion], { name: 'notificacionesSinLeer' })
  findUnread(
    @Args('usuarioId', { type: () => ID }) usuarioId: string,
  ): Promise<Notificacion[]> {
    return this.notificationsService.findUnread(usuarioId);
  }

  /** Conteo de notificaciones no leídas (útil para el badge en UI) */
  @Query(() => Int, { name: 'conteoSinLeer' })
  countUnread(
    @Args('usuarioId', { type: () => ID }) usuarioId: string,
  ): Promise<number> {
    return this.notificationsService.countUnread(usuarioId);
  }

  // ── MUTATIONS ────────────────────────────────────────────────────────────────

  /**
   * Crear una notificación manual (ej. desde admin o sistema).
   * Las notificaciones automáticas de citas las genera AppoinmentsService.
   */
  @Mutation(() => Notificacion)
  createNotificacion(
    @Args('input') input: CreateNotificacionInput,
  ): Promise<Notificacion> {
    return this.notificationsService.create(input);
  }

  /** Marcar una notificación específica como leída */
  @Mutation(() => Notificacion)
  marcarNotificacionLeida(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Notificacion> {
    return this.notificationsService.markAsRead(id);
  }

  /** Marcar todas las notificaciones de un usuario como leídas */
  @Mutation(() => Int, {
    description: 'Retorna el número de notificaciones marcadas como leídas',
  })
  marcarTodasLeidas(
    @Args('usuarioId', { type: () => ID }) usuarioId: string,
  ): Promise<number> {
    return this.notificationsService.markAllAsRead(usuarioId);
  }

  /** Eliminar una notificación */
  @Mutation(() => Notificacion)
  eliminarNotificacion(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Notificacion> {
    return this.notificationsService.remove(id);
  }

  /** Eliminar todas las notificaciones ya leídas de un usuario */
  @Mutation(() => Int, {
    description: 'Retorna el número de notificaciones eliminadas',
  })
  limpiarNotificacionesLeidas(
    @Args('usuarioId', { type: () => ID }) usuarioId: string,
  ): Promise<number> {
    return this.notificationsService.removeAllRead(usuarioId);
  }

  // ── SUBSCRIPTION ─────────────────────────────────────────────────────────────

  /**
   * Canal en tiempo real de nuevas notificaciones para un usuario.
   * Se emite cada vez que se crea una notificación para ese usuarioId,
   * ya sea por el sistema de citas, por un admin, o manualmente.
   */
  @Subscription(() => Notificacion, { name: 'nuevaNotificacion' })
  nuevaNotificacion(
    @Args('usuarioId', { type: () => ID }) usuarioId: string,
  ) {
    return this.pubSub.asyncIterableIterator(`NOTIF_${usuarioId}`);
  }
}
