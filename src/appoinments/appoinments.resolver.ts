import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  ID,
} from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { AppoinmentsService } from './appoinments.service';
import { Appoinment } from './entities/appoinment.entity';
import { SlotDisponible } from './entities/slot-disponible.entity';
import { CitaEvento } from './entities/cita-evento.entity';
import { CreateAppoinmentInput } from './dto/create-appoinment.input';
import { UpdateAppoinmentInput } from './dto/update-appoinment.input';
import { CancelAppoinmentInput } from './dto/cancel-appoinment.input';
import { ExtendAppoinmentInput } from './dto/extend-appoinment.input';
import { ConfirmSlotInput } from './dto/confirm-slot.input';
import { RescheduleAppoinmentInput } from './dto/reschedule-appoinment.input';

@Resolver(() => Appoinment)
export class AppoinmentsResolver {
  constructor(
    private readonly appoinmentsService: AppoinmentsService,
    @Inject('PUBSUB') private readonly pubSub: PubSub,
  ) {}

  // ── QUERIES ──────────────────────────────────────────────────────────────────

  @Query(() => [Appoinment], { name: 'appoinments' })
  findAll(): Promise<Appoinment[]> {
    return this.appoinmentsService.findAll();
  }

  @Query(() => Appoinment, { name: 'appoinment' })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<Appoinment> {
    return this.appoinmentsService.findOne(id);
  }

  /** Citas de un médico, opcionalmente filtradas por fecha */
  @Query(() => [Appoinment], { name: 'appoinmentsByDoctor' })
  findByDoctor(
    @Args('medicoId', { type: () => ID }) medicoId: string,
    @Args('fecha', { nullable: true }) fecha?: Date,
  ): Promise<Appoinment[]> {
    return this.appoinmentsService.findByDoctor(medicoId, fecha);
  }

  /** Citas de un paciente */
  @Query(() => [Appoinment], { name: 'appoinmentsByPatient' })
  findByPatient(
    @Args('pacienteId', { type: () => ID }) pacienteId: string,
  ): Promise<Appoinment[]> {
    return this.appoinmentsService.findByPatient(pacienteId);
  }

  /**
   * Slots libres de un médico en una fecha dada.
   * El paciente usa esta query para seleccionar su horario antes de agendar.
   */
  @Query(() => [SlotDisponible], { name: 'availableSlots' })
  availableSlots(
    @Args('medicoId', { type: () => ID }) medicoId: string,
    @Args('fecha') fecha: Date,
  ): Promise<SlotDisponible[]> {
    return this.appoinmentsService.getAvailableSlots(medicoId, fecha);
  }

  // ── MUTATIONS ────────────────────────────────────────────────────────────────

  /** Agendar una cita en un slot disponible */
  @Mutation(() => Appoinment)
  createAppoinment(
    @Args('input') input: CreateAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.create(input);
  }

  /** Actualizar notas del médico o motivo de la cita */
  @Mutation(() => Appoinment)
  updateAppoinment(
    @Args('input') input: UpdateAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.update(input.id, input);
  }

  /**
   * Cancelar una cita.
   * Automáticamente notifica al siguiente paciente sobre el slot liberado.
   */
  @Mutation(() => Appoinment)
  cancelAppoinment(
    @Args('input') input: CancelAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.cancel(input);
  }

  /**
   * Posponer una cita a una nueva fecha/hora.
   * El slot original se ofrece al siguiente paciente en cola.
   */
  @Mutation(() => Appoinment)
  postponeAppoinment(
    @Args('id', { type: () => ID }) id: string,
    @Args('nuevaFechaHora') nuevaFechaHora: Date,
    @Args('motivo', { nullable: true }) motivo?: string,
  ): Promise<Appoinment> {
    return this.appoinmentsService.postpone(id, nuevaFechaHora, motivo);
  }

  /**
   * El médico extiende la consulta actual N minutos.
   * - Desplaza automáticamente las citas siguientes.
   * - Las que no caben en el horario del día quedan POSPUESTAS
   *   y el paciente recibe opciones de reagendamiento.
   */
  @Mutation(() => Appoinment)
  extendCurrentAppoinment(
    @Args('input') input: ExtendAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.extendCurrentAppointment(input);
  }

  /**
   * El paciente confirma que acepta el slot adelantado ofertado.
   * Solo se acepta con la notificación original sin haber expirado.
   */
  @Mutation(() => Appoinment)
  confirmSlotOffer(
    @Args('input') input: ConfirmSlotInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.confirmSlotOffer(input);
  }

  /**
   * El paciente elige su nuevo horario tras un reagendamiento obligatorio.
   * Solo disponible cuando la cita está en estado POSPUESTA.
   */
  @Mutation(() => Appoinment)
  rescheduleAppoinment(
    @Args('input') input: RescheduleAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.rescheduleAppointment(input);
  }

  // ── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

  /**
   * Canal del médico/recepcionista: emite cada vez que cualquier cita suya cambia.
   * Suscribirse con el medicoId para recibir actualizaciones en tiempo real.
   *
   * Eventos: CREADA | CANCELADA | POSPUESTA | EXTENDIDA |
   *          MOVIDA | REAGENDADO_REQUERIDO | REAGENDADA
   */
  @Subscription(() => CitaEvento, { name: 'citaActualizada' })
  citaActualizada(
    @Args('medicoId', { type: () => ID }) medicoId: string,
  ) {
    return this.pubSub.asyncIterableIterator(`CITA_MEDICO_${medicoId}`);
  }

  /**
   * Canal del paciente: emite cuando su cita cambia o recibe oferta de slot.
   * Suscribirse con el pacienteId para recibir notificaciones en tiempo real.
   *
   * Eventos: CANCELADA | POSPUESTA | MOVIDA | SLOT_OFERTADO |
   *          CONFIRMADA_SLOT | REAGENDADO_REQUERIDO | REAGENDADA
   */
  @Subscription(() => CitaEvento, { name: 'citaPacienteActualizada' })
  citaPacienteActualizada(
    @Args('pacienteId', { type: () => ID }) pacienteId: string,
  ) {
    return this.pubSub.asyncIterableIterator(`CITA_PACIENTE_${pacienteId}`);
  }
}
