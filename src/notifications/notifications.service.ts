import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { Notificacion } from './entities/notification.entity';
import { CreateNotificacionInput } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NOTIF_PUBSUB') private readonly pubSub: PubSub,
  ) {}

  /**
   * Crea una notificación, la persiste en BD y la emite en tiempo real
   * al canal del usuario destinatario.
   */
  async create(input: CreateNotificacionInput): Promise<Notificacion> {
    const notif = await this.prisma.notificaciones.create({
      data: {
        usuario_id: input.usuarioId,
        titulo: input.titulo,
        mensaje: input.mensaje,
        tipo: input.tipo,
        referencia_id: input.referenciaId,
      },
    });

    const entity = this.mapToEntity(notif);

    await this.pubSub.publish(`NOTIF_${input.usuarioId}`, {
      nuevaNotificacion: entity,
    });

    return entity;
  }

  /** Todas las notificaciones de un usuario, ordenadas por más recientes */
  async findByUser(usuarioId: string): Promise<Notificacion[]> {
    const notifs = await this.prisma.notificaciones.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { creado_en: 'desc' },
    });
    return notifs.map((n) => this.mapToEntity(n));
  }

  /** Solo las notificaciones no leídas de un usuario */
  async findUnread(usuarioId: string): Promise<Notificacion[]> {
    const notifs = await this.prisma.notificaciones.findMany({
      where: { usuario_id: usuarioId, leida: false },
      orderBy: { creado_en: 'desc' },
    });
    return notifs.map((n) => this.mapToEntity(n));
  }

  /** Contar notificaciones no leídas */
  async countUnread(usuarioId: string): Promise<number> {
    return this.prisma.notificaciones.count({
      where: { usuario_id: usuarioId, leida: false },
    });
  }

  /** Marcar una notificación específica como leída */
  async markAsRead(id: string): Promise<Notificacion> {
    const notif = await this.prisma.notificaciones.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException(`Notificación "${id}" no encontrada`);

    const updated = await this.prisma.notificaciones.update({
      where: { id },
      data: { leida: true },
    });
    return this.mapToEntity(updated);
  }

  /** Marcar todas las notificaciones de un usuario como leídas */
  async markAllAsRead(usuarioId: string): Promise<number> {
    const result = await this.prisma.notificaciones.updateMany({
      where: { usuario_id: usuarioId, leida: false },
      data: { leida: true },
    });
    return result.count;
  }

  /** Eliminar una notificación */
  async remove(id: string): Promise<Notificacion> {
    const notif = await this.prisma.notificaciones.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException(`Notificación "${id}" no encontrada`);
    await this.prisma.notificaciones.delete({ where: { id } });
    return this.mapToEntity(notif);
  }

  /** Eliminar todas las notificaciones leídas de un usuario */
  async removeAllRead(usuarioId: string): Promise<number> {
    const result = await this.prisma.notificaciones.deleteMany({
      where: { usuario_id: usuarioId, leida: true },
    });
    return result.count;
  }

  mapToEntity(record: {
    id: string;
    usuario_id: string;
    titulo: string;
    mensaje: string;
    tipo: string;
    leida: boolean;
    referencia_id: string | null;
    creado_en: Date;
  }): Notificacion {
    return {
      id: record.id,
      usuarioId: record.usuario_id,
      titulo: record.titulo,
      mensaje: record.mensaje,
      tipo: record.tipo,
      leida: record.leida,
      referenciaId: record.referencia_id ?? undefined,
      creadoEn: record.creado_en,
    };
  }
}
