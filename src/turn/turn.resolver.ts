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
import { TurnService, CANAL_TURNO_HOSPITAL, CANAL_TURNO_PACIENTE } from './turn.service';
import { Turno, TurnoEvento, EstadoTurno } from './entities/turn.entity';
import { CreateTurnInput } from './dto/create-turn.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';

@Resolver(() => Turno)
export class TurnResolver {
  constructor(
    private readonly turnService: TurnService,
    @Inject('TURN_PUBSUB') private readonly pubSub: PubSub,
  ) {}

  // ── QUERIES ──────────────────────────────────────────────────────────────────

  /**
   * Cola de turnos del hospital del usuario autenticado para hoy.
   * Opcionalmente filtra por estado.
   */
  @Auth()
  @Query(() => [Turno], { name: 'turnosPorHospital' })
  findByHospital(
    @CurrentUser() user: JwtPayload,
    @Args('fecha', { nullable: true }) fecha?: Date,
    @Args('estado', { type: () => EstadoTurno, nullable: true }) estado?: EstadoTurno,
  ): Promise<Turno[]> {
    return this.turnService.findByHospital(user.hospitalId!, fecha, estado);
  }

  /**
   * Turnos de un paciente específico.
   */
  @Auth()
  @Query(() => [Turno], { name: 'turnosPorPaciente' })
  findByPaciente(
    @Args('pacienteId', { type: () => ID }) pacienteId: string,
    @Args('fecha', { nullable: true }) fecha?: Date,
  ): Promise<Turno[]> {
    return this.turnService.findByPaciente(pacienteId, fecha);
  }

  @Auth()
  @Query(() => Turno, { name: 'turno' })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<Turno> {
    return this.turnService.findOne(id);
  }

  /** Cantidad de turnos en espera en el hospital del usuario */
  @Auth()
  @Query(() => Int, { name: 'turnosEnEspera' })
  contarEnEspera(
    @CurrentUser() user: JwtPayload,
    @Args('medicoId', { type: () => ID, nullable: true }) medicoId?: string,
  ): Promise<number> {
    return this.turnService.contarEnEspera(user.hospitalId!, medicoId);
  }

  // ── MUTATIONS ────────────────────────────────────────────────────────────────

  /**
   * Registrar un nuevo turno en la cola del hospital.
   * Cualquier usuario autenticado puede solicitar un turno para un paciente.
   */
  @Auth()
  @Mutation(() => Turno, { description: 'Registrar un nuevo turno en la cola del hospital' })
  crearTurno(@Args('input') input: CreateTurnInput): Promise<Turno> {
    return this.turnService.create(input);
  }

  /**
   * Llamar al siguiente turno en espera. Solo MEDICO, ENFERMERO y RECEPCIONISTA.
   */
  @Auth(RolUsuario.MEDICO, RolUsuario.ENFERMERO, RolUsuario.RECEPCIONISTA, RolUsuario.ADMIN)
  @Mutation(() => Turno, { description: 'Llamar al siguiente turno en espera según prioridad' })
  llamarSiguienteTurno(
    @CurrentUser() user: JwtPayload,
    @Args('medicoId', { type: () => ID, nullable: true }) medicoId?: string,
  ): Promise<Turno> {
    return this.turnService.llamarSiguiente(user.hospitalId!, medicoId);
  }

  /**
   * Marcar turno como atendido (completo). Solo MEDICO y ENFERMERO.
   */
  @Auth(RolUsuario.MEDICO, RolUsuario.ENFERMERO, RolUsuario.ADMIN)
  @Mutation(() => Turno, { description: 'Marcar un turno como completado/atendido' })
  atenderTurno(@Args('id', { type: () => ID }) id: string): Promise<Turno> {
    return this.turnService.atender(id);
  }

  /**
   * Cancelar un turno. ADMIN, RECEPCIONISTA o el propio paciente.
   */
  @Auth()
  @Mutation(() => Turno, { description: 'Cancelar un turno activo' })
  cancelarTurno(@Args('id', { type: () => ID }) id: string): Promise<Turno> {
    return this.turnService.cancelar(id);
  }

  // ── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

  /**
   * Canal de turnos del hospital del usuario.
   * Emite en tiempo real cada cambio de estado en la cola del hospital.
   * Úselo en pantallas de recepción/sala de espera.
   *
   * Eventos: CREADO | LLAMADO | ATENDIDO | CANCELADO
   */
  @Subscription(() => TurnoEvento, {
    name: 'turnoActualizado',
    description:
      'Recibe actualizaciones en tiempo real de todos los turnos del hospital indicado. ' +
      'Usar en pantallas de sala de espera y recepción.',
  })
  turnoActualizado(@Args('hospitalId', { type: () => Int }) hospitalId: number) {
    return this.pubSub.asyncIterableIterator(CANAL_TURNO_HOSPITAL(hospitalId));
  }

  /**
   * Canal personal del paciente.
   * Emite cuando el turno del paciente es llamado, atendido o cancelado.
   *
   * Eventos: CREADO | LLAMADO | ATENDIDO | CANCELADO
   */
  @Subscription(() => TurnoEvento, {
    name: 'miTurnoActualizado',
    description:
      'Canal personal del paciente. Recibe actualizaciones de su turno en tiempo real.',
  })
  miTurnoActualizado(@Args('pacienteId', { type: () => ID }) pacienteId: string) {
    return this.pubSub.asyncIterableIterator(CANAL_TURNO_PACIENTE(pacienteId));
  }
}
