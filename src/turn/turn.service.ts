import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Turno, EstadoTurno, TipoTurno } from './entities/turn.entity';
import { CreateTurnInput } from './dto/create-turn.dto';

export const CANAL_TURNO_HOSPITAL = (hospitalId: number) =>
  `TURNO_HOSPITAL_${hospitalId}`;
export const CANAL_TURNO_PACIENTE = (pacienteId: string) =>
  `TURNO_PACIENTE_${pacienteId}`;

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TurnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Inject('TURN_PUBSUB') private readonly pubSub: PubSub,
  ) {}

  // ── CREAR TURNO ───────────────────────────────────────────────────────────────

  async create(input: CreateTurnInput): Promise<Turno> {
    const hospital = await this.prisma.hospitales.findUnique({
      where: { id: input.hospitalId },
    });
    if (!hospital || !hospital.activo) {
      throw new NotFoundException(
        `Hospital con ID ${input.hospitalId} no encontrado o inactivo`,
      );
    }

    const paciente = await this.prisma.pacientes.findUnique({
      where: { id: input.pacienteId },
    });
    if (!paciente) {
      throw new NotFoundException(
        `Paciente con ID ${input.pacienteId} no encontrado`,
      );
    }

    if (input.medicoId) {
      const medico = await this.prisma.medicos.findUnique({
        where: { id: input.medicoId },
      });
      if (!medico) {
        throw new NotFoundException(
          `Médico con ID ${input.medicoId} no encontrado`,
        );
      }
      if (!medico.activo) {
        throw new BadRequestException(
          `El médico con ID ${input.medicoId} no está activo`,
        );
      }
    }

    if (input.especialidadId) {
      const especialidad = await this.prisma.especialidades.findUnique({
        where: { id: input.especialidadId },
      });
      if (!especialidad) {
        throw new NotFoundException(
          `Especialidad con ID ${input.especialidadId} no encontrada`,
        );
      }
    }

    const hoy = this.today();

    for (let intento = 0; intento < 5; intento++) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          await this.acquireQueueLock(tx, input.hospitalId, hoy);

          const turnoActivoHoy = await tx.turnos.findFirst({
            where: {
              paciente_id: input.pacienteId,
              hospital_id: input.hospitalId,
              fecha: hoy,
              estado: { in: [EstadoTurno.EN_ESPERA, EstadoTurno.EN_CONSULTA] },
            },
          });
          if (turnoActivoHoy) {
            throw new ConflictException(
              `El paciente ya tiene un turno activo hoy en este hospital (turno #${turnoActivoHoy.numero_turno})`,
            );
          }

          const totalTurnosDia = await tx.turnos.count({
            where: { hospital_id: input.hospitalId, fecha: hoy },
          });
          const ultimoTurno = await tx.turnos.findFirst({
            where: { hospital_id: input.hospitalId, fecha: hoy },
            orderBy: { numero_turno: 'desc' },
            select: { numero_turno: true },
          });
          // Regla de negocio: numero diario = total turnos del dia + 1.
          // Fallback defensivo para evitar choques si existen datos legacy no contiguos.
          const numeroTurno =
            Math.max(totalTurnosDia, ultimoTurno?.numero_turno ?? 0) + 1;

          const enEspera = await tx.turnos.count({
            where: {
              hospital_id: input.hospitalId,
              fecha: hoy,
              estado: EstadoTurno.EN_ESPERA,
            },
          });
          const posicionCola = enEspera + 1;

          const turno = await tx.turnos.create({
            data: {
              paciente_id: input.pacienteId,
              hospital_id: input.hospitalId,
              medico_id: input.medicoId,
              especialidad_id: input.especialidadId,
              numero_turno: numeroTurno,
              tipo: input.tipo ?? TipoTurno.NORMAL,
              estado: EstadoTurno.EN_ESPERA,
              posicion_cola: posicionCola,
              fecha: hoy,
            },
          });

          return { turno, numeroTurno, posicionCola };
        });

        const entity = this.mapToEntity(result.turno);

        await this.pubSub.publish(CANAL_TURNO_HOSPITAL(input.hospitalId), {
          turnoActualizado: { tipo: 'CREADO', turno: entity },
        });
        await this.pubSub.publish(CANAL_TURNO_PACIENTE(input.pacienteId), {
          miTurnoActualizado: {
            tipo: 'CREADO',
            turno: entity,
            mensaje: `Tu turno #${result.numeroTurno} fue registrado. Posición en cola: ${result.posicionCola}`,
          },
        });

        await this.notificationsService.create({
          usuarioId: paciente.usuario_id,
          titulo: `Turno #${result.numeroTurno} registrado`,
          mensaje: `Tu turno #${result.numeroTurno} fue registrado en ${hospital.nombre}. Posición en cola: ${result.posicionCola}.`,
          tipo: 'TURNO_CREADO',
          referenciaId: result.turno.id,
        });

        return entity;
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }

        if (this.isTurnNumberConflict(error) && intento < 4) {
          continue;
        }

        if (this.isRetryableTransactionError(error) && intento < 4) {
          continue;
        }

        if (this.isTurnNumberConflict(error)) {
          throw new ConflictException(
            'Conflicto de numeración de turnos por alta concurrencia. Intenta nuevamente.',
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      'No se pudo asignar un número de turno en este momento por alta concurrencia. Intenta nuevamente.',
    );
  }

  // ── LLAMAR SIGUIENTE ──────────────────────────────────────────────────────────

  async llamarSiguiente(hospitalId: number, medicoId?: string): Promise<Turno> {
    const hoy = this.today();

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.acquireQueueLock(tx, hospitalId, hoy);

      const whereBase = {
        hospital_id: hospitalId,
        fecha: hoy,
        estado: EstadoTurno.EN_ESPERA,
        ...(medicoId && { medico_id: medicoId }),
      };

      const turnoALlamar = await tx.turnos.findFirst({
        where: whereBase,
        orderBy: [{ tipo: 'desc' }, { numero_turno: 'asc' }],
      });
      if (!turnoALlamar) {
        const scopeMessage = medicoId
          ? `No hay turnos en espera para el hospital ${hospitalId} y médico ${medicoId}`
          : `No hay turnos en espera para el hospital ${hospitalId}`;
        throw new NotFoundException(scopeMessage);
      }

      const updatedTurno = await tx.turnos.update({
        where: { id: turnoALlamar.id },
        data: {
          estado: EstadoTurno.EN_CONSULTA,
          llamado_en: new Date(),
          posicion_cola: 0,
        },
        include: { pacientes: { select: { usuario_id: true } } },
      });

      await this.recalcularPosicionesTx(tx, hospitalId, medicoId, hoy);

      return updatedTurno;
    });

    const pacienteIncluido = updated.pacientes;
    const entity = this.mapToEntity(updated);

    await this.pubSub.publish(CANAL_TURNO_HOSPITAL(hospitalId), {
      turnoActualizado: {
        tipo: 'LLAMADO',
        turno: entity,
        mensaje: `Turno #${entity.numeroTurno} - Por favor pase al consultorio`,
      },
    });

    if (pacienteIncluido) {
      await this.pubSub.publish(CANAL_TURNO_PACIENTE(updated.paciente_id), {
        miTurnoActualizado: {
          tipo: 'LLAMADO',
          turno: entity,
          mensaje: `¡Tu turno #${entity.numeroTurno} está siendo llamado! Dirígete al consultorio.`,
        },
      });

      await this.notificationsService.create({
        usuarioId: pacienteIncluido.usuario_id,
        titulo: `¡Es tu turno! #${entity.numeroTurno}`,
        mensaje: `Tu turno #${entity.numeroTurno} está siendo llamado. Por favor dirígete al consultorio.`,
        tipo: 'TURNO_LLAMADO',
        referenciaId: updated.id,
      });
    }

    return entity;
  }

  // ── ATENDER (COMPLETAR) ───────────────────────────────────────────────────────

  async atender(id: string): Promise<Turno> {
    const turno = await this.prisma.turnos.findUnique({ where: { id } });
    if (!turno) throw new NotFoundException(`Turno "${id}" no encontrado`);
    if (String(turno.estado) !== 'EN_CONSULTA') {
      throw new BadRequestException(
        'Solo se pueden completar turnos en estado EN_CONSULTA',
      );
    }

    const updatedCount = await this.prisma.turnos.updateMany({
      where: { id, estado: EstadoTurno.EN_CONSULTA },
      data: { estado: EstadoTurno.ATENDIDO, atendido_en: new Date() },
    });
    if (updatedCount.count === 0) {
      throw new ConflictException(
        'El turno cambió de estado antes de marcarse como atendido',
      );
    }

    const updated = await this.prisma.turnos.findUnique({ where: { id } });
    if (!updated) throw new NotFoundException(`Turno "${id}" no encontrado`);

    const entity = this.mapToEntity(updated);

    if (turno.hospital_id) {
      await this.pubSub.publish(CANAL_TURNO_HOSPITAL(turno.hospital_id), {
        turnoActualizado: { tipo: 'ATENDIDO', turno: entity },
      });
    }

    await this.pubSub.publish(CANAL_TURNO_PACIENTE(turno.paciente_id), {
      miTurnoActualizado: {
        tipo: 'ATENDIDO',
        turno: entity,
        mensaje: 'Tu atención ha concluido. ¡Que te vaya bien!',
      },
    });

    return entity;
  }

  // ── CANCELAR ─────────────────────────────────────────────────────────────────

  async cancelar(id: string): Promise<Turno> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const turno = await tx.turnos.findUnique({ where: { id } });
      if (!turno) throw new NotFoundException(`Turno "${id}" no encontrado`);

      if (turno.hospital_id) {
        await this.acquireQueueLock(
          tx,
          turno.hospital_id,
          this.toDate(turno.fecha),
        );
      }

      const updatedCount = await tx.turnos.updateMany({
        where: {
          id,
          estado: { in: [EstadoTurno.EN_ESPERA, EstadoTurno.EN_CONSULTA] },
        },
        data: { estado: EstadoTurno.CANCELADO },
      });

      if (updatedCount.count === 0) {
        throw new BadRequestException(
          `No se puede cancelar un turno en estado ${turno.estado}`,
        );
      }

      if (turno.hospital_id) {
        await this.recalcularPosicionesTx(
          tx,
          turno.hospital_id,
          undefined,
          this.toDate(turno.fecha),
        );
      }

      const updatedTurno = await tx.turnos.findUnique({ where: { id } });
      if (!updatedTurno)
        throw new NotFoundException(`Turno "${id}" no encontrado`);
      return updatedTurno;
    });

    const entity = this.mapToEntity(updated);

    if (updated.hospital_id) {
      await this.pubSub.publish(CANAL_TURNO_HOSPITAL(updated.hospital_id), {
        turnoActualizado: { tipo: 'CANCELADO', turno: entity },
      });
    }

    await this.pubSub.publish(CANAL_TURNO_PACIENTE(updated.paciente_id), {
      miTurnoActualizado: {
        tipo: 'CANCELADO',
        turno: entity,
        mensaje: 'Tu turno fue cancelado.',
      },
    });

    return entity;
  }

  // ── CONSULTAS ────────────────────────────────────────────────────────────────

  async findByHospital(
    hospitalId: number,
    fecha?: Date,
    estado?: EstadoTurno,
  ): Promise<Turno[]> {
    const fechaFiltro = fecha ? this.toDate(fecha) : this.today();

    const turnos = await this.prisma.turnos.findMany({
      where: {
        hospital_id: hospitalId,
        fecha: fechaFiltro,
        ...(estado && { estado }),
      },
      orderBy: [{ tipo: 'desc' }, { numero_turno: 'asc' }],
    });

    return turnos.map((t) => this.mapToEntity(t));
  }

  async findByPaciente(pacienteId: string, fecha?: Date): Promise<Turno[]> {
    const turnos = await this.prisma.turnos.findMany({
      where: {
        paciente_id: pacienteId,
        ...(fecha && { fecha: this.toDate(fecha) }),
      },
      orderBy: { creado_en: 'desc' },
    });
    return turnos.map((t) => this.mapToEntity(t));
  }

  async findOne(id: string): Promise<Turno> {
    const turno = await this.prisma.turnos.findUnique({ where: { id } });
    if (!turno) throw new NotFoundException(`Turno "${id}" no encontrado`);
    return this.mapToEntity(turno);
  }

  async contarEnEspera(hospitalId: number, medicoId?: string): Promise<number> {
    return this.prisma.turnos.count({
      where: {
        hospital_id: hospitalId,
        fecha: this.today(),
        estado: EstadoTurno.EN_ESPERA,
        ...(medicoId && { medico_id: medicoId }),
      },
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  private async recalcularPosiciones(
    hospitalId: number,
    medicoId?: string,
  ): Promise<void> {
    await this.recalcularPosicionesTx(
      this.prisma,
      hospitalId,
      medicoId,
      this.today(),
    );
  }

  private async recalcularPosicionesTx(
    db: PrismaClientLike,
    hospitalId: number,
    medicoId?: string,
    fecha?: Date,
  ): Promise<void> {
    const turnos = await db.turnos.findMany({
      where: {
        hospital_id: hospitalId,
        fecha: fecha ?? this.today(),
        estado: EstadoTurno.EN_ESPERA,
        ...(medicoId && { medico_id: medicoId }),
      },
      orderBy: [{ tipo: 'desc' }, { numero_turno: 'asc' }],
      select: { id: true },
    });

    if (turnos.length === 0) return;

    // Evita SQL raw dinámico para prevenir errores P2010 por dialecto/adaptador.
    for (const [index, turno] of turnos.entries()) {
      await db.turnos.update({
        where: { id: turno.id },
        data: { posicion_cola: index + 1 },
      });
    }
  }

  private async acquireQueueLock(
    tx: Prisma.TransactionClient,
    hospitalId: number,
    fecha: Date,
  ): Promise<void> {
    const dayKey = fecha.toISOString().slice(0, 10);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`turnos:${hospitalId}:${dayKey}`}))`;
  }

  private today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private isTurnNumberConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const targetMeta = error.meta?.target;
    const target = Array.isArray(targetMeta)
      ? targetMeta
          .filter((value): value is string => typeof value === 'string')
          .join(',')
      : typeof targetMeta === 'string'
        ? targetMeta
        : '';

    return /idx_turnos_unique|idx_turnos_unique_hospital_fecha_numero|turnos.*numero_turno|fecha.*numero_turno/i.test(
      `${target} ${error.message}`,
    );
  }

  private isRetryableTransactionError(error: unknown): boolean {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      return true;
    }

    if (error instanceof Error) {
      return /deadlock detected|could not serialize access|serialization failure/i.test(
        error.message,
      );
    }

    return false;
  }

  private toDate(d: Date): Date {
    const result = new Date(d);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  mapToEntity(record: {
    id: string;
    paciente_id: string;
    medico_id: string | null;
    especialidad_id: number | null;
    hospital_id: number | null;
    numero_turno: number;
    tipo: string;
    estado: string;
    posicion_cola: number | null;
    llamado_en: Date | null;
    atendido_en: Date | null;
    fecha: Date;
    creado_en: Date;
  }): Turno {
    return {
      id: record.id,
      pacienteId: record.paciente_id,
      medicoId: record.medico_id ?? undefined,
      especialidadId: record.especialidad_id ?? undefined,
      hospitalId: record.hospital_id ?? undefined,
      numeroTurno: record.numero_turno,
      tipo: record.tipo as TipoTurno,
      estado: record.estado as EstadoTurno,
      posicionCola: record.posicion_cola ?? undefined,
      llamadoEn: record.llamado_en ?? undefined,
      atendidoEn: record.atendido_en ?? undefined,
      fecha: record.fecha,
      creadoEn: record.creado_en,
    };
  }
}
