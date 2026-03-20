import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { HistorialService } from './historial.service';
import { HistorialMedico } from './entities/historial-medico.entity';
import { CreateHistorialInput } from './dto/create-historial.input';
import { UpdateHistorialInput } from './dto/update-historial.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Flujo del historial médico:
 *  1. MEDICO crea un registro de historial tras una consulta (puede vincularse a una cita con citaId).
 *  2. MEDICO puede actualizar únicamente sus propios registros; ADMIN puede actualizar cualquiera.
 *  3. El historial no se elimina (inmutabilidad clínica).
 *  4. MEDICO ve el historial de sus pacientes; ADMIN ve cualquier historial;
 *     PACIENTE puede ver su propio historial (filtrado por su pacienteId).
 */
@Resolver(() => HistorialMedico)
export class HistorialResolver {
  constructor(private readonly historialService: HistorialService) {}

  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN)
  @Mutation(() => HistorialMedico, {
    description: 'Crea un registro en el historial médico de un paciente (MEDICO/ADMIN)',
  })
  createHistorial(
    @Args('input') input: CreateHistorialInput,
  ): Promise<HistorialMedico> {
    return this.historialService.create(input);
  }

  @Auth()
  @Query(() => [HistorialMedico], {
    name: 'historialByPaciente',
    description: 'Historial médico completo de un paciente (ordenado del más reciente al más antiguo)',
  })
  findByPaciente(
    @Args('pacienteId', { type: () => ID }) pacienteId: string,
  ): Promise<HistorialMedico[]> {
    return this.historialService.findByPaciente(pacienteId);
  }

  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN)
  @Query(() => [HistorialMedico], {
    name: 'historialByMedico',
    description: 'Registros de historial generados por un médico (MEDICO/ADMIN)',
  })
  findByMedico(
    @Args('medicoId', { type: () => ID }) medicoId: string,
  ): Promise<HistorialMedico[]> {
    return this.historialService.findByMedico(medicoId);
  }

  @Auth()
  @Query(() => HistorialMedico, {
    name: 'historial',
    description: 'Busca un registro de historial médico por ID',
  })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<HistorialMedico> {
    return this.historialService.findOne(id);
  }

  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN)
  @Mutation(() => HistorialMedico, {
    description:
      'Actualiza diagnóstico, tratamiento u observaciones de un historial. Solo el médico autor o ADMIN.',
  })
  updateHistorial(
    @Args('input') input: UpdateHistorialInput,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<HistorialMedico> {
    return this.historialService.update(input.id, input, currentUser);
  }
}
