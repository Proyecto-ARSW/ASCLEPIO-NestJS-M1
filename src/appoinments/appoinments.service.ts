import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { Appoinment } from './entities/appoinment.entity';
import { SlotDisponible } from './entities/slot-disponible.entity';
import { EstadoCita } from './entities/estado-cita.enum';
import { CreateAppoinmentInput } from './dto/create-appoinment.input';
import { UpdateAppoinmentInput } from './dto/update-appoinment.input';
import { CancelAppoinmentInput } from './dto/cancel-appoinment.input';
import { ExtendAppoinmentInput } from './dto/extend-appoinment.input';
import { ConfirmSlotInput } from './dto/confirm-slot.input';
import { RescheduleAppoinmentInput } from './dto/reschedule-appoinment.input';

const CANAL_MEDICO = (id: string) => `CITA_MEDICO_${id}`;
const CANAL_PACIENTE = (id: string) => `CITA_PACIENTE_${id}`;
export const CANAL_HOSPITAL_CITA = (id: number) => `CITA_HOSPITAL_${id}`;

@Injectable()
export class AppoinmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly rabbitmqService: RabbitmqService,
    @Inject('PUBSUB') private readonly pubSub: PubSub,
  ) {}

  // ── FILTRADO POR HOSPITAL ─────────────────────────────────────────────────────

  /** Obtiene los IDs de médicos vinculados a un hospital específico. */
  async getMedicoIdsByHospital(hospitalId: number): Promise<string[]> {
    const medicos = await this.prisma.medicos.findMany({
      where: {
        usuarios: {
          hospital_usuario: { some: { hospital_id: hospitalId } },
        },
        activo: true,
      },
      select: { id: true },
    });
    return medicos.map((m) => m.id);
  }

  // ── SLOTS DISPONIBLES ────────────────────────────────────────────────────────

  async getAvailableSlots(medicoId: string, fecha: Date): Promise<SlotDisponible[]> {
    const diaSemana = new Date(fecha).getDay();

    const disponibilidad = await this.prisma.disponibilidad_medico.findFirst({
      where: { medico_id: medicoId, dia_semana: diaSemana, activo: true },
    });
    if (!disponibilidad) return [];

    const citasExistentes = await this.prisma.citas.findMany({
      where: {
        medico_id: medicoId,
        fecha_hora: { gte: this.startOfDay(fecha), lte: this.endOfDay(fecha) },
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
      },
    });

    return this.computeSlots(fecha, disponibilidad, citasExistentes);
  }

  /** Cálculo puro de slots — sin queries. Reutilizable con datos pre-cargados. */
  private computeSlots(
    fecha: Date,
    disponibilidad: { hora_inicio: Date; hora_fin: Date; duracion_cita: number },
    citasExistentes: { fecha_hora: Date; duracion_minutos: number }[],
  ): SlotDisponible[] {
    const duracion = disponibilidad.duracion_cita;
    const horaInicio = new Date(fecha);
    horaInicio.setHours(
      disponibilidad.hora_inicio.getHours(),
      disponibilidad.hora_inicio.getMinutes(),
      0,
      0,
    );
    const horaFin = new Date(fecha);
    horaFin.setHours(
      disponibilidad.hora_fin.getHours(),
      disponibilidad.hora_fin.getMinutes(),
      0,
      0,
    );

    const slots: SlotDisponible[] = [];
    let cursor = new Date(horaInicio);

    while (cursor < horaFin) {
      const slotFin = new Date(cursor.getTime() + duracion * 60_000);
      if (slotFin > horaFin) break;

      const ocupado = citasExistentes.some((c) => {
        const citaFin = new Date(c.fecha_hora.getTime() + c.duracion_minutos * 60_000);
        return c.fecha_hora < slotFin && citaFin > cursor;
      });

      if (!ocupado) slots.push({ fechaHora: new Date(cursor), duracionMinutos: duracion });
      cursor = new Date(cursor.getTime() + duracion * 60_000);
    }

    return slots;
  }

  // ── CRUD BASE ────────────────────────────────────────────────────────────────

  async create(input: CreateAppoinmentInput): Promise<Appoinment> {
    if (input.disponibilidadId === undefined && input.diaSemana === undefined && !input.fechaHora) {
      throw new BadRequestException(
        'Debes indicar "disponibilidadId", "diaSemana" (0-6) o "fechaHora" (slot exacto ISO)',
      );
    }

    const paciente = await this.prisma.pacientes.findUnique({ where: { id: input.pacienteId } });
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${input.pacienteId} no encontrado`);
    }

    const medico = await this.prisma.medicos.findUnique({ where: { id: input.medicoId } });
    if (!medico) {
      throw new NotFoundException(`Médico con ID ${input.medicoId} no encontrado`);
    }
    if (!medico.activo) {
      throw new BadRequestException(`El médico con ID ${input.medicoId} no está activo`);
    }

    let fechaSlot: Date;

    if (input.fechaHora) {
      // ── Opción 1: slot exacto por fecha/hora ISO ──────────────────────────────
      const slots = await this.getAvailableSlots(input.medicoId, input.fechaHora);
      const solicitado = new Date(input.fechaHora).getTime();
      const slotExacto = slots.find((s) => s.fechaHora.getTime() === solicitado);
      if (!slotExacto) {
        throw new ConflictException('El horario seleccionado no está disponible para este médico');
      }
      fechaSlot = input.fechaHora;
    } else if (input.disponibilidadId !== undefined) {
      // ── Opción 2: por ID de bloque de disponibilidad ──────────────────────────
      const bloque = await this.prisma.disponibilidad_medico.findUnique({
        where: { id: input.disponibilidadId },
      });
      if (!bloque) {
        throw new NotFoundException(`Bloque de disponibilidad con ID ${input.disponibilidadId} no encontrado`);
      }
      if (!bloque.activo) {
        throw new BadRequestException(`El bloque de disponibilidad ${input.disponibilidadId} no está activo`);
      }
      if (bloque.medico_id !== input.medicoId) {
        throw new BadRequestException('El bloque de disponibilidad no pertenece al médico indicado');
      }

      const fechaDia = this.nextDateForDay(bloque.dia_semana);
      const slots = await this.getAvailableSlots(input.medicoId, fechaDia);

      if (slots.length === 0) {
        throw new ConflictException('No hay slots disponibles en ese bloque de disponibilidad');
      }

      if (input.hora) {
        const [h, m] = input.hora.split(':').map(Number);
        const slotHora = slots.find(
          (s) => s.fechaHora.getHours() === h && s.fechaHora.getMinutes() === m,
        );
        if (!slotHora) {
          throw new ConflictException(
            `El horario ${input.hora} no está disponible en ese bloque. ` +
              `Slots libres: ${slots.map((s) => `${String(s.fechaHora.getHours()).padStart(2, '0')}:${String(s.fechaHora.getMinutes()).padStart(2, '0')}`).join(', ')}`,
          );
        }
        fechaSlot = slotHora.fechaHora;
      } else {
        fechaSlot = slots[0].fechaHora;
      }
    } else {
      // ── Opción 3: por día de la semana ────────────────────────────────────────
      const fechaDia = this.nextDateForDay(input.diaSemana!);
      const slots = await this.getAvailableSlots(input.medicoId, fechaDia);

      if (slots.length === 0) {
        throw new ConflictException('No hay slots disponibles para ese médico en el día indicado');
      }

      if (input.hora) {
        const [h, m] = input.hora.split(':').map(Number);
        const slotHora = slots.find(
          (s) => s.fechaHora.getHours() === h && s.fechaHora.getMinutes() === m,
        );
        if (!slotHora) {
          throw new ConflictException(
            `El horario ${input.hora} no está disponible ese día. ` +
              `Slots libres: ${slots.map((s) => `${String(s.fechaHora.getHours()).padStart(2, '0')}:${String(s.fechaHora.getMinutes()).padStart(2, '0')}`).join(', ')}`,
          );
        }
        fechaSlot = slotHora.fechaHora;
      } else {
        fechaSlot = slots[0].fechaHora;
      }
    }

    const cita = await this.prisma.citas.create({
      data: {
        paciente_id: input.pacienteId,
        medico_id: input.medicoId,
        fecha_hora: fechaSlot,
        motivo: input.motivo,
      },
    });

    const entity = this.mapToEntity(cita);

    await this.pubSub.publish(CANAL_MEDICO(cita.medico_id), {
      citaActualizada: { tipo: 'CREADA', cita: entity },
    });

    void this.rabbitmqService.notifyAppointmentCreated(cita.id);

    return entity;
  }

  /**
   * Lista citas. ADMIN/RECEPCIONISTA ven todas las de su hospital.
   * @param hospitalId Filtra por médicos del hospital cuando se pasa.
   * @param sinFiltro Si es true devuelve TODO (solo ADMIN global).
   */
  async findAll(hospitalId?: number): Promise<Appoinment[]> {
    if (hospitalId) {
      const medicoIds = await this.getMedicoIdsByHospital(hospitalId);
      const citas = await this.prisma.citas.findMany({
        where: { medico_id: { in: medicoIds } },
        orderBy: { fecha_hora: 'asc' },
      });
      return citas.map((c) => this.mapToEntity(c));
    }

    const citas = await this.prisma.citas.findMany({ orderBy: { fecha_hora: 'asc' } });
    return citas.map((c) => this.mapToEntity(c));
  }

  async findOne(id: string): Promise<Appoinment> {
    const cita = await this.prisma.citas.findUnique({ where: { id } });
    if (!cita) throw new NotFoundException(`Cita "${id}" no encontrada`);
    return this.mapToEntity(cita);
  }

  /**
   * Citas de un médico — validando que pertenezca al hospital del usuario.
   */
  async findByDoctor(medicoId: string, hospitalId: number, fecha?: Date): Promise<Appoinment[]> {
    const medicoEnHospital = await this.prisma.medicos.findFirst({
      where: {
        id: medicoId,
        usuarios: {
          hospital_usuario: { some: { hospital_id: hospitalId } },
        },
      },
    });
    if (!medicoEnHospital) {
      throw new NotFoundException('El médico no pertenece al hospital actual o no existe');
    }

    const where: Record<string, unknown> = { medico_id: medicoId };
    if (fecha) {
      where.fecha_hora = { gte: this.startOfDay(fecha), lte: this.endOfDay(fecha) };
    }

    const citas = await this.prisma.citas.findMany({ where, orderBy: { fecha_hora: 'asc' } });
    return citas.map((c) => this.mapToEntity(c));
  }

  /** Citas de un paciente — ve TODAS sin importar el hospital. */
  async findByPatient(pacienteId: string): Promise<Appoinment[]> {
    const citas = await this.prisma.citas.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { fecha_hora: 'asc' },
    });
    return citas.map((c) => this.mapToEntity(c));
  }

  async update(id: string, input: UpdateAppoinmentInput): Promise<Appoinment> {
    await this.findOne(id);
    const cita = await this.prisma.citas.update({
      where: { id },
      data: {
        ...(input.notasMedico !== undefined && { notas_medico: input.notasMedico }),
        ...(input.motivo !== undefined && { motivo: input.motivo }),
        actualizado_en: new Date(),
      },
    });
    return this.mapToEntity(cita);
  }

  // ── CANCELACIÓN ──────────────────────────────────────────────────────────────

  async cancel(input: CancelAppoinmentInput): Promise<Appoinment> {
    const cita = await this.prisma.citas.findUnique({ where: { id: input.id } });
    if (!cita) throw new NotFoundException(`Cita "${input.id}" no encontrada`);
    if (cita.estado === 'CANCELADA') throw new BadRequestException('La cita ya está cancelada');

    const usuarioIdCancelador = await this.resolveUsuarioId(input.canceladaPor);

    const updated = await this.prisma.citas.update({
      where: { id: input.id },
      data: {
        estado: 'CANCELADA',
        cancelada_por: usuarioIdCancelador,
        motivo_cancelacion: input.motivoCancelacion,
        actualizado_en: new Date(),
      },
    });

    const entity = this.mapToEntity(updated);

    await this.pubSub.publish(CANAL_MEDICO(cita.medico_id), {
      citaActualizada: { tipo: 'CANCELADA', cita: entity, mensaje: input.motivoCancelacion },
    });
    await this.pubSub.publish(CANAL_PACIENTE(cita.paciente_id), {
      citaPacienteActualizada: {
        tipo: 'CANCELADA',
        cita: entity,
        mensaje: input.motivoCancelacion ?? 'Tu cita ha sido cancelada',
      },
    });

    await this.ofrecerSlotLiberado(cita.medico_id, cita.fecha_hora, cita.duracion_minutos, cita.id);

    void this.rabbitmqService.notifyAppointmentCancelled(input.id, input.motivoCancelacion ?? undefined);

    return entity;
  }

  // ── COMPLETAR ────────────────────────────────────────────────────────────────

  /**
   * Marca una cita como COMPLETADA (atendida).
   * El recepcionista puede usar esta acción cuando el médico ya atendió al paciente
   * y solo necesita cerrar el registro administrativo desde su panel.
   */
  async complete(id: string): Promise<Appoinment> {
    const cita = await this.prisma.citas.findUnique({ where: { id } });
    if (!cita) throw new NotFoundException(`Cita "${id}" no encontrada`);
    if (cita.estado === 'COMPLETADA') {
      throw new BadRequestException('La cita ya está completada');
    }
    if (cita.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede completar una cita cancelada');
    }

    const updated = await this.prisma.citas.update({
      where: { id },
      data: { estado: 'COMPLETADA', actualizado_en: new Date() },
    });

    const entity = this.mapToEntity(updated);

    // Notificar en tiempo real al médico y al paciente
    await this.pubSub.publish(CANAL_MEDICO(cita.medico_id), {
      citaActualizada: { tipo: 'COMPLETADA', cita: entity, mensaje: null },
    });
    await this.pubSub.publish(CANAL_PACIENTE(cita.paciente_id), {
      citaPacienteActualizada: {
        tipo: 'COMPLETADA',
        cita: entity,
        mensaje: 'Tu cita ha sido marcada como atendida',
      },
    });

    return entity;
  }

  // ── POSPONER ─────────────────────────────────────────────────────────────────

  async postpone(id: string, nuevaFechaHora: Date, motivo?: string): Promise<Appoinment> {
    const cita = await this.prisma.citas.findUnique({ where: { id } });
    if (!cita) throw new NotFoundException(`Cita "${id}" no encontrada`);

    const slotOriginal = cita.fecha_hora;

    const updated = await this.prisma.citas.update({
      where: { id },
      data: {
        fecha_hora: nuevaFechaHora,
        estado: 'POSPUESTA',
        motivo_cancelacion: motivo,
        actualizado_en: new Date(),
      },
    });

    const entity = this.mapToEntity(updated);

    await this.pubSub.publish(CANAL_MEDICO(cita.medico_id), {
      citaActualizada: { tipo: 'POSPUESTA', cita: entity },
    });
    await this.pubSub.publish(CANAL_PACIENTE(cita.paciente_id), {
      citaPacienteActualizada: {
        tipo: 'POSPUESTA',
        cita: entity,
        mensaje: `Tu cita fue pospuesta al ${nuevaFechaHora.toLocaleString('es-CO')}`,
      },
    });

    await this.ofrecerSlotLiberado(cita.medico_id, slotOriginal, cita.duracion_minutos, cita.id);

    return entity;
  }

  // ── EXTENDER ─────────────────────────────────────────────────────────────────

  async extendCurrentAppointment(input: ExtendAppoinmentInput): Promise<Appoinment> {
    const cita = await this.prisma.citas.findUnique({ where: { id: input.id } });
    if (!cita) throw new NotFoundException(`Cita "${input.id}" no encontrada`);
    if (input.minutosAdicionales <= 0) {
      throw new BadRequestException('Los minutos adicionales deben ser positivos');
    }

    const diaSemana = cita.fecha_hora.getDay();
    const disponibilidad = await this.prisma.disponibilidad_medico.findFirst({
      where: { medico_id: cita.medico_id, dia_semana: diaSemana, activo: true },
    });

    const horaFinDia: Date | null = disponibilidad
      ? (() => {
          const d = new Date(cita.fecha_hora);
          d.setHours(
            disponibilidad.hora_fin.getHours(),
            disponibilidad.hora_fin.getMinutes(),
            0,
            0,
          );
          return d;
        })()
      : null;

    const nuevaDuracion = cita.duracion_minutos + input.minutosAdicionales;
    const citaExtendida = await this.prisma.citas.update({
      where: { id: input.id },
      data: { duracion_minutos: nuevaDuracion, actualizado_en: new Date() },
    });
    const entity = this.mapToEntity(citaExtendida);

    await this.pubSub.publish(CANAL_MEDICO(cita.medico_id), {
      citaActualizada: {
        tipo: 'EXTENDIDA',
        cita: entity,
        mensaje: `La consulta actual se extendió ${input.minutosAdicionales} minutos`,
      },
    });

    const citasSiguientes = await this.prisma.citas.findMany({
      where: {
        medico_id: cita.medico_id,
        fecha_hora: { gt: cita.fecha_hora, lte: this.endOfDay(cita.fecha_hora) },
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
        id: { not: cita.id },
      },
      orderBy: { fecha_hora: 'asc' },
    });

    // Preload de pacientes: 1 query para todo el loop en lugar de 1 por iteración
    const uniquePacienteIds = [...new Set(citasSiguientes.map((c) => c.paciente_id))];
    const pacientesPreload = await this.prisma.pacientes.findMany({
      where: { id: { in: uniquePacienteIds } },
      select: { id: true, usuario_id: true },
    });
    const pacienteMap = new Map(pacientesPreload.map((p) => [p.id, p.usuario_id]));

    for (const sig of citasSiguientes) {
      const nuevaFecha = new Date(sig.fecha_hora.getTime() + input.minutosAdicionales * 60_000);
      const nuevaFin = new Date(nuevaFecha.getTime() + sig.duracion_minutos * 60_000);

      if (horaFinDia && nuevaFin > horaFinDia) {
        await this.prisma.citas.update({
          where: { id: sig.id },
          data: { estado: 'POSPUESTA', actualizado_en: new Date() },
        });

        const slotsDisponibles = await this.getSlotsProximos(sig.medico_id, cita.fecha_hora);

        await this.notificationsService.create({
          usuarioId: pacienteMap.get(sig.paciente_id) ?? (await this.getUsuarioIdPorPaciente(sig.paciente_id)),
          titulo: 'Reagendamiento requerido',
          mensaje:
            'Tu cita no pudo realizarse hoy por extensión de consultas anteriores. ' +
            'Por favor elige un nuevo horario.',
          tipo: 'REAGENDADO_REQUERIDO',
          referenciaId: sig.id,
        });

        const sigEntity = this.mapToEntity({ ...sig, estado: 'POSPUESTA', actualizado_en: new Date() });

        await this.pubSub.publish(CANAL_PACIENTE(sig.paciente_id), {
          citaPacienteActualizada: {
            tipo: 'REAGENDADO_REQUERIDO',
            cita: sigEntity,
            mensaje: 'Tu cita fue pospuesta. Selecciona un nuevo horario.',
            slotsDisponibles,
          },
        });
        await this.pubSub.publish(CANAL_MEDICO(cita.medico_id), {
          citaActualizada: { tipo: 'REAGENDADO_REQUERIDO', cita: sigEntity },
        });
      } else {
        await this.prisma.citas.update({
          where: { id: sig.id },
          data: { fecha_hora: nuevaFecha, actualizado_en: new Date() },
        });

        const sigEntity = this.mapToEntity({ ...sig, fecha_hora: nuevaFecha, actualizado_en: new Date() });

        await this.pubSub.publish(CANAL_PACIENTE(sig.paciente_id), {
          citaPacienteActualizada: {
            tipo: 'MOVIDA',
            cita: sigEntity,
            mensaje: `Tu cita se movió ${input.minutosAdicionales} min por extensión de la consulta anterior.`,
          },
        });
        await this.pubSub.publish(CANAL_MEDICO(cita.medico_id), {
          citaActualizada: { tipo: 'MOVIDA', cita: sigEntity },
        });
      }
    }

    return entity;
  }

  // ── CONFIRMAR SLOT OFERTADO ──────────────────────────────────────────────────

  async confirmSlotOffer(input: ConfirmSlotInput): Promise<Appoinment> {
    const notif = await this.prisma.notificaciones.findUnique({ where: { id: input.notificacionId } });
    if (!notif || notif.tipo !== 'SLOT_DISPONIBLE') throw new NotFoundException('Oferta de slot no encontrada');
    if (notif.leida) throw new BadRequestException('Esta oferta ya fue procesada o ha expirado');

    const citaLiberada = await this.prisma.citas.findUnique({ where: { id: notif.referencia_id! } });
    if (!citaLiberada) throw new NotFoundException('El slot ya no está disponible');

    const paciente = await this.prisma.pacientes.findFirst({ where: { usuario_id: notif.usuario_id } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado');
    if (paciente.id !== input.pacienteId) throw new BadRequestException('No estás autorizado para confirmar esta oferta');

    const citaPaciente = await this.prisma.citas.findFirst({
      where: {
        paciente_id: paciente.id,
        medico_id: citaLiberada.medico_id,
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
        fecha_hora: { gt: citaLiberada.fecha_hora },
      },
      orderBy: { fecha_hora: 'asc' },
    });
    if (!citaPaciente) throw new NotFoundException('No se encontró una cita activa para este paciente');

    const [updated] = await this.prisma.$transaction([
      this.prisma.citas.update({
        where: { id: citaPaciente.id },
        data: { fecha_hora: citaLiberada.fecha_hora, actualizado_en: new Date() },
      }),
      this.prisma.notificaciones.update({ where: { id: input.notificacionId }, data: { leida: true } }),
    ]);

    const entity = this.mapToEntity(updated);

    await this.pubSub.publish(CANAL_MEDICO(citaPaciente.medico_id), { citaActualizada: { tipo: 'MOVIDA', cita: entity } });
    await this.pubSub.publish(CANAL_PACIENTE(paciente.id), {
      citaPacienteActualizada: { tipo: 'CONFIRMADA_SLOT', cita: entity, mensaje: 'Has confirmado el nuevo horario.' },
    });

    return entity;
  }

  // ── REAGENDAR ────────────────────────────────────────────────────────────────

  async rescheduleAppointment(input: RescheduleAppoinmentInput): Promise<Appoinment> {
    const cita = await this.prisma.citas.findUnique({ where: { id: input.citaId } });
    if (!cita) throw new NotFoundException('Cita no encontrada');
    if (cita.estado !== 'POSPUESTA') throw new BadRequestException('Solo se pueden reagendar citas en estado POSPUESTA');

    const slots = await this.getAvailableSlots(cita.medico_id, input.nuevaFechaHora);
    const solicitado = new Date(input.nuevaFechaHora).getTime();
    const valido = slots.some((s) => s.fechaHora.getTime() === solicitado);
    if (!valido) throw new ConflictException('El horario seleccionado no está disponible');

    const updated = await this.prisma.citas.update({
      where: { id: input.citaId },
      data: {
        fecha_hora: input.nuevaFechaHora,
        estado: 'PENDIENTE',
        reagendada_de: input.citaId,
        actualizado_en: new Date(),
      },
    });

    const entity = this.mapToEntity(updated);

    await this.pubSub.publish(CANAL_MEDICO(cita.medico_id), { citaActualizada: { tipo: 'REAGENDADA', cita: entity } });
    await this.pubSub.publish(CANAL_PACIENTE(cita.paciente_id), {
      citaPacienteActualizada: {
        tipo: 'REAGENDADA',
        cita: entity,
        mensaje: `Tu cita fue reagendada para el ${input.nuevaFechaHora.toLocaleString('es-CO')}`,
      },
    });

    return entity;
  }

  // ── HELPERS PRIVADOS ─────────────────────────────────────────────────────────

  private async ofrecerSlotLiberado(
    medicoId: string,
    fechaHoraSlot: Date,
    _duracion: number,
    citaReferenciaId: string,
  ): Promise<void> {
    const siguienteCita = await this.prisma.citas.findFirst({
      where: {
        medico_id: medicoId,
        fecha_hora: { gt: fechaHoraSlot, lte: this.endOfDay(fechaHoraSlot) },
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
      },
      orderBy: { fecha_hora: 'asc' },
      include: { pacientes: true },
    });

    if (!siguienteCita) return;

    const notif = await this.notificationsService.create({
      usuarioId: siguienteCita.pacientes.usuario_id,
      titulo: 'Horario adelantado disponible',
      mensaje:
        `Se liberó el horario ${fechaHoraSlot.toLocaleTimeString('es-CO')} ` +
        `con tu médico. ¿Deseas adelantar tu cita a este horario?`,
      tipo: 'SLOT_DISPONIBLE',
      referenciaId: citaReferenciaId,
    });

    const citaEntity = this.mapToEntity(siguienteCita);

    await this.pubSub.publish(CANAL_PACIENTE(siguienteCita.paciente_id), {
      citaPacienteActualizada: {
        tipo: 'SLOT_OFERTADO',
        cita: citaEntity,
        mensaje: `¿Deseas adelantar tu cita al ${fechaHoraSlot.toLocaleTimeString('es-CO')}?`,
        notificacionId: notif.id,
      },
    });
  }

  private async getSlotsProximos(medicoId: string, desde: Date): Promise<SlotDisponible[]> {
    // 1 query: todas las disponibilidades del médico
    const disponibilidades = await this.prisma.disponibilidad_medico.findMany({
      where: { medico_id: medicoId, activo: true },
    });
    if (disponibilidades.length === 0) return [];

    // Rango de 7 días a partir de mañana
    const rangoInicio = new Date(desde);
    rangoInicio.setDate(rangoInicio.getDate() + 1);
    rangoInicio.setHours(0, 0, 0, 0);
    const rangoFin = new Date(desde);
    rangoFin.setDate(rangoFin.getDate() + 7);
    rangoFin.setHours(23, 59, 59, 999);

    // 1 query: todas las citas del rango completo
    const citasRango = await this.prisma.citas.findMany({
      where: {
        medico_id: medicoId,
        fecha_hora: { gte: rangoInicio, lte: rangoFin },
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
      },
    });

    const resultado: SlotDisponible[] = [];
    for (let i = 1; i <= 7 && resultado.length < 5; i++) {
      const fecha = new Date(desde);
      fecha.setDate(fecha.getDate() + i);
      const diaSemana = fecha.getDay();

      const disp = disponibilidades.filter((d) => d.dia_semana === diaSemana);
      if (disp.length === 0) continue;

      const inicioD = this.startOfDay(fecha);
      const finD = this.endOfDay(fecha);
      const citasDia = citasRango.filter((c) => c.fecha_hora >= inicioD && c.fecha_hora <= finD);

      for (const bloque of disp) {
        const slots = this.computeSlots(fecha, bloque, citasDia);
        resultado.push(...slots.slice(0, 5 - resultado.length));
        if (resultado.length >= 5) break;
      }
    }
    return resultado;
  }

  private async getUsuarioIdPorPaciente(pacienteId: string): Promise<string> {
    const paciente = await this.prisma.pacientes.findUnique({ where: { id: pacienteId } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado');
    return paciente.usuario_id;
  }

  private async resolveUsuarioId(id: string): Promise<string> {
    // 3 queries en paralelo en lugar de secuenciales
    const [usuario, medico, paciente] = await Promise.all([
      this.prisma.usuarios.findUnique({ where: { id }, select: { id: true } }),
      this.prisma.medicos.findUnique({ where: { id }, select: { usuario_id: true } }),
      this.prisma.pacientes.findUnique({ where: { id }, select: { usuario_id: true } }),
    ]);

    if (usuario) return id;
    if (medico) return medico.usuario_id;
    if (paciente) return paciente.usuario_id;

    throw new BadRequestException(`El ID "${id}" no corresponde a ningún usuario, médico o paciente`);
  }

  private nextDateForDay(diaSemana: number): Date {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let diff = diaSemana - hoy.getDay();
    if (diff <= 0) diff += 7;
    const next = new Date(hoy);
    next.setDate(hoy.getDate() + diff);
    return next;
  }

  private startOfDay(fecha: Date): Date {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(fecha: Date): Date {
    const d = new Date(fecha);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  mapToEntity(record: {
    id: string;
    paciente_id: string;
    medico_id: string;
    fecha_hora: Date;
    duracion_minutos: number;
    estado: string;
    motivo?: string | null;
    notas_medico?: string | null;
    reagendada_de?: string | null;
    cancelada_por?: string | null;
    motivo_cancelacion?: string | null;
    creado_en: Date;
    actualizado_en: Date;
  }): Appoinment {
    return {
      id: record.id,
      pacienteId: record.paciente_id,
      medicoId: record.medico_id,
      fechaHora: record.fecha_hora,
      duracionMinutos: record.duracion_minutos,
      estado: record.estado as EstadoCita,
      motivo: record.motivo ?? undefined,
      notasMedico: record.notas_medico ?? undefined,
      reagendadaDe: record.reagendada_de ?? undefined,
      canceladaPor: record.cancelada_por ?? undefined,
      motivoCancelacion: record.motivo_cancelacion ?? undefined,
      creadoEn: record.creado_en,
      actualizadoEn: record.actualizado_en,
    };
  }
}
