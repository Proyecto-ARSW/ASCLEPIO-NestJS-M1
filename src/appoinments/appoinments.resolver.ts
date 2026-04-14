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
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';

@Resolver(() => Appoinment)
export class AppoinmentsResolver {
  constructor(
    private readonly appoinmentsService: AppoinmentsService,
    @Inject('PUBSUB') private readonly pubSub: PubSub,
  ) {}

  // ── QUERIES ──────────────────────────────────────────────────────────────────

  /** Lista todas las citas del hospital del usuario autenticado (ADMIN/RECEPCIONISTA) */
  @Auth(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Query(() => [Appoinment], { name: 'appoinments' })
  findAll(@CurrentUser() user: JwtPayload): Promise<Appoinment[]> {
    return this.appoinmentsService.findAll(user.hospitalId);
  }

  @Auth()
  @Query(() => Appoinment, { name: 'appoinment' })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<Appoinment> {
    return this.appoinmentsService.findOne(id);
  }

  /** Citas de un médico, filtradas por el hospital del usuario autenticado */
  @Auth()
  @Query(() => [Appoinment], { name: 'appoinmentsByDoctor' })
  findByDoctor(
    @CurrentUser() user: JwtPayload,
    @Args('medicoId', { type: () => ID }) medicoId: string,
    @Args('fecha', { nullable: true }) fecha?: Date,
  ): Promise<Appoinment[]> {
    return this.appoinmentsService.findByDoctor(
      medicoId,
      user.hospitalId!,
      fecha,
    );
  }

  /** Citas de un paciente — ve TODAS sin importar hospital */
  @Auth()
  @Query(() => [Appoinment], { name: 'appoinmentsByPatient' })
  findByPatient(
    @Args('pacienteId', { type: () => ID }) pacienteId: string,
  ): Promise<Appoinment[]> {
    return this.appoinmentsService.findByPatient(pacienteId);
  }

  /** Slots disponibles de un médico en una fecha */
  @Auth()
  @Query(() => [SlotDisponible], { name: 'availableSlots' })
  availableSlots(
    @Args('medicoId', { type: () => ID }) medicoId: string,
    @Args('fecha') fecha: Date,
  ): Promise<SlotDisponible[]> {
    return this.appoinmentsService.getAvailableSlots(medicoId, fecha);
  }

  // ── MUTATIONS ────────────────────────────────────────────────────────────────

  @Auth(
    RolUsuario.PACIENTE,
    RolUsuario.MEDICO,
    RolUsuario.ADMIN,
    RolUsuario.RECEPCIONISTA,
  )
  @Mutation(() => Appoinment)
  createAppoinment(
    @Args('input') input: CreateAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.create(input);
  }

  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => Appoinment)
  updateAppoinment(
    @Args('input') input: UpdateAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.update(input.id, input);
  }

  @Auth()
  @Mutation(() => Appoinment)
  cancelAppoinment(
    @Args('input') input: CancelAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.cancel(input);
  }

  /** Marca una cita como COMPLETADA (atendida). Usado por recepcionista para cierre administrativo. */
  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => Appoinment)
  completeAppoinment(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Appoinment> {
    return this.appoinmentsService.complete(id);
  }

  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => Appoinment)
  postponeAppoinment(
    @Args('id', { type: () => ID }) id: string,
    @Args('nuevaFechaHora') nuevaFechaHora: Date,
    @Args('motivo', { nullable: true }) motivo?: string,
  ): Promise<Appoinment> {
    return this.appoinmentsService.postpone(id, nuevaFechaHora, motivo);
  }

  @Auth(RolUsuario.MEDICO)
  @Mutation(() => Appoinment)
  extendCurrentAppoinment(
    @Args('input') input: ExtendAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.extendCurrentAppointment(input);
  }

  @Auth(RolUsuario.PACIENTE)
  @Mutation(() => Appoinment)
  confirmSlotOffer(
    @Args('input') input: ConfirmSlotInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.confirmSlotOffer(input);
  }

  @Auth(RolUsuario.PACIENTE)
  @Mutation(() => Appoinment)
  rescheduleAppoinment(
    @Args('input') input: RescheduleAppoinmentInput,
  ): Promise<Appoinment> {
    return this.appoinmentsService.rescheduleAppointment(input);
  }

  // ── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

  /**
   * Canal del médico: emite cada vez que cualquier cita del médico cambia.
   * Eventos: CREADA | CANCELADA | POSPUESTA | EXTENDIDA | MOVIDA | REAGENDADO_REQUERIDO | REAGENDADA
   */
  @Subscription(() => CitaEvento, { name: 'citaActualizada' })
  citaActualizada(@Args('medicoId', { type: () => ID }) medicoId: string) {
    return this.pubSub.asyncIterableIterator(`CITA_MEDICO_${medicoId}`);
  }

  /**
   * Canal del paciente: emite cuando su cita cambia o recibe oferta de slot.
   * Eventos: CANCELADA | POSPUESTA | MOVIDA | SLOT_OFERTADO | CONFIRMADA_SLOT | REAGENDADO_REQUERIDO | REAGENDADA
   */
  @Subscription(() => CitaEvento, { name: 'citaPacienteActualizada' })
  citaPacienteActualizada(
    @Args('pacienteId', { type: () => ID }) pacienteId: string,
  ) {
    return this.pubSub.asyncIterableIterator(`CITA_PACIENTE_${pacienteId}`);
  }
}
