import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Turno, EstadoTurno, TipoTurno } from './entities/turn.entity';
import { CreateTurnInput } from './dto/create-turn.dto';

export const CANAL_TURNO_HOSPITAL = (hospitalId: number) => `TURNO_HOSPITAL_${hospitalId}`;
export const CANAL_TURNO_PACIENTE = (pacienteId: string) => `TURNO_PACIENTE_${pacienteId}`;

@Injectable()
export class TurnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Inject('TURN_PUBSUB') private readonly pubSub: PubSub,
  ) {}

  // ── CREAR TURNO ───────────────────────────────────────────────────────────────

  async create(input: CreateTurnInput): Promise<Turno> {
    const hospital = await this.prisma.hospitales.findUnique({ where: { id: input.hospitalId } });
    if (!hospital || !hospital.activo) {
      throw new NotFoundException(`Hospital con ID ${input.hospitalId} no encontrado o inactivo`);
    }

    const paciente = await this.prisma.pacientes.findUnique({ where: { id: input.pacienteId } });
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${input.pacienteId} no encontrado`);
    }

    const hoy = this.today();

    const turnoActivoHoy = await this.prisma.turnos.findFirst({
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

    const ultimoTurno = await this.prisma.turnos.findFirst({
      where: { hospital_id: input.hospitalId, fecha: hoy },
      orderBy: { numero_turno: 'desc' },
    });
    const numeroTurno = (ultimoTurno?.numero_turno ?? 0) + 1;

    const enEspera = await this.prisma.turnos.count({
      where: { hospital_id: input.hospitalId, fecha: hoy, estado: EstadoTurno.EN_ESPERA },
    });
    const posicionCola = enEspera + 1;

    const turno = await this.prisma.turnos.create({
      data: {
        paciente_id: input.pacienteId,
        hospital_id: input.hospitalId,
        medico_id: input.medicoId,
        especialidad_id: input.especialidadId,
        numero_turno: numeroTurno,
        tipo: input.tipo ?? TipoTurno.NORMAL,
        estado: EstadoTurno.EN_ESPERA,
        posicion_cola: posicionCola,
      },
    });

    const entity = this.mapToEntity(turno);

    await this.pubSub.publish(CANAL_TURNO_HOSPITAL(input.hospitalId), {
      turnoActualizado: { tipo: 'CREADO', turno: entity },
    });
    await this.pubSub.publish(CANAL_TURNO_PACIENTE(input.pacienteId), {
      miTurnoActualizado: {
        tipo: 'CREADO',
        turno: entity,
        mensaje: `Tu turno #${numeroTurno} fue registrado. Posición en cola: ${posicionCola}`,
      },
    });

    await this.notificationsService.create({
      usuarioId: paciente.usuario_id,
      titulo: `Turno #${numeroTurno} registrado`,
      mensaje: `Tu turno #${numeroTurno} fue registrado en ${hospital.nombre}. Posición en cola: ${posicionCola}.`,
      tipo: 'TURNO_CREADO',
      referenciaId: turno.id,
    });

    return entity;
  }

  // ── LLAMAR SIGUIENTE ──────────────────────────────────────────────────────────

  async llamarSiguiente(hospitalId: number, medicoId?: string): Promise<Turno> {
    const hoy = this.today();
    const whereBase: Record<string, unknown> = {
      hospital_id: hospitalId,
      fecha: hoy,
      estado: EstadoTurno.EN_ESPERA,
    };
    if (medicoId) whereBase.medico_id = medicoId;

    // Prioridad: URGENTE > PRIORITARIO > NORMAL
    const urgente = await this.prisma.turnos.findFirst({
      where: { ...whereBase, tipo: TipoTurno.URGENTE },
      orderBy: { numero_turno: 'asc' },
    });
    const prioritario = await this.prisma.turnos.findFirst({
      where: { ...whereBase, tipo: TipoTurno.PRIORITARIO },
      orderBy: { numero_turno: 'asc' },
    });
    const normal = await this.prisma.turnos.findFirst({
      where: { ...whereBase, tipo: TipoTurno.NORMAL },
      orderBy: { numero_turno: 'asc' },
    });

    const turnoALlamar = urgente ?? prioritario ?? normal;
    if (!turnoALlamar) {
      throw new NotFoundException('No hay turnos en espera en este hospital');
    }

    const updated = await this.prisma.turnos.update({
      where: { id: turnoALlamar.id },
      data: { estado: EstadoTurno.EN_CONSULTA, llamado_en: new Date(), posicion_cola: 0 },
    });

    const entity = this.mapToEntity(updated);

    await this.pubSub.publish(CANAL_TURNO_HOSPITAL(hospitalId), {
      turnoActualizado: {
        tipo: 'LLAMADO',
        turno: entity,
        mensaje: `Turno #${entity.numeroTurno} - Por favor pase al consultorio`,
      },
    });

    const paciente = await this.prisma.pacientes.findUnique({
      where: { id: turnoALlamar.paciente_id },
    });
    if (paciente) {
      await this.pubSub.publish(CANAL_TURNO_PACIENTE(turnoALlamar.paciente_id), {
        miTurnoActualizado: {
          tipo: 'LLAMADO',
          turno: entity,
          mensaje: `¡Tu turno #${entity.numeroTurno} está siendo llamado! Dirígete al consultorio.`,
        },
      });

      await this.notificationsService.create({
        usuarioId: paciente.usuario_id,
        titulo: `¡Es tu turno! #${entity.numeroTurno}`,
        mensaje: `Tu turno #${entity.numeroTurno} está siendo llamado. Por favor dirígete al consultorio.`,
        tipo: 'TURNO_LLAMADO',
        referenciaId: turnoALlamar.id,
      });
    }

    await this.recalcularPosiciones(hospitalId, medicoId);

    return entity;
  }

  // ── ATENDER (COMPLETAR) ───────────────────────────────────────────────────────

  async atender(id: string): Promise<Turno> {
    const turno = await this.prisma.turnos.findUnique({ where: { id } });
    if (!turno) throw new NotFoundException(`Turno "${id}" no encontrado`);
    if (turno.estado !== EstadoTurno.EN_CONSULTA) {
      throw new BadRequestException('Solo se pueden completar turnos en estado EN_CONSULTA');
    }

    const updated = await this.prisma.turnos.update({
      where: { id },
      data: { estado: EstadoTurno.ATENDIDO, atendido_en: new Date() },
    });

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
    const turno = await this.prisma.turnos.findUnique({ where: { id } });
    if (!turno) throw new NotFoundException(`Turno "${id}" no encontrado`);
    if ([EstadoTurno.ATENDIDO, EstadoTurno.CANCELADO].includes(turno.estado as EstadoTurno)) {
      throw new BadRequestException(`No se puede cancelar un turno en estado ${turno.estado}`);
    }

    const updated = await this.prisma.turnos.update({
      where: { id },
      data: { estado: EstadoTurno.CANCELADO },
    });

    const entity = this.mapToEntity(updated);

    if (turno.hospital_id) {
      await this.pubSub.publish(CANAL_TURNO_HOSPITAL(turno.hospital_id), {
        turnoActualizado: { tipo: 'CANCELADO', turno: entity },
      });
      await this.recalcularPosiciones(turno.hospital_id);
    }

    await this.pubSub.publish(CANAL_TURNO_PACIENTE(turno.paciente_id), {
      miTurnoActualizado: { tipo: 'CANCELADO', turno: entity, mensaje: 'Tu turno fue cancelado.' },
    });

    return entity;
  }

  // ── CONSULTAS ────────────────────────────────────────────────────────────────

  async findByHospital(hospitalId: number, fecha?: Date, estado?: EstadoTurno): Promise<Turno[]> {
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

  private async recalcularPosiciones(hospitalId: number, medicoId?: string): Promise<void> {
    const turnos = await this.prisma.turnos.findMany({
      where: {
        hospital_id: hospitalId,
        fecha: this.today(),
        estado: EstadoTurno.EN_ESPERA,
        ...(medicoId && { medico_id: medicoId }),
      },
      orderBy: [{ tipo: 'desc' }, { numero_turno: 'asc' }],
    });

    await Promise.all(
      turnos.map((t, i) =>
        this.prisma.turnos.update({ where: { id: t.id }, data: { posicion_cola: i + 1 } }),
      ),
    );
  }

  private today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
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
