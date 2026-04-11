import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { DisponibilidadEnfermeroService } from './disponibilidad-enfermero.service';
import { DisponibilidadEnfermero } from './entities/disponibilidad-enfermero.entity';
import { CreateDisponibilidadEnfermeroInput } from './dto/create-disponibilidad-enfermero.input';
import { UpdateDisponibilidadEnfermeroInput } from './dto/update-disponibilidad-enfermero.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

/**
 * Flujo de disponibilidad de enfermero:
 *  1. ADMIN o RECEPCIONISTA crean bloques de disponibilidad por día/hora.
 *  2. El sistema valida unicidad (enfermero_id, dia_semana, hora_inicio) a nivel BD.
 *  3. Se puede desactivar toda la disponibilidad de un enfermero sin eliminar los registros.
 */
@Resolver(() => DisponibilidadEnfermero)
export class DisponibilidadEnfermeroResolver {
  constructor(private readonly dispService: DisponibilidadEnfermeroService) {}

  @Auth(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => DisponibilidadEnfermero, {
    description: 'Crea un bloque de disponibilidad horaria para un enfermero',
  })
  createDisponibilidadEnfermero(
    @Args('input') input: CreateDisponibilidadEnfermeroInput,
  ): Promise<DisponibilidadEnfermero> {
    return this.dispService.create(input);
  }

  @Auth()
  @Query(() => [DisponibilidadEnfermero], {
    name: 'disponibilidadesByNurse',
    description: 'Lista los bloques de disponibilidad de un enfermero',
  })
  findByNurse(
    @Args('enfermeroId', { type: () => ID }) enfermeroId: string,
  ): Promise<DisponibilidadEnfermero[]> {
    return this.dispService.findByNurse(enfermeroId);
  }

  @Auth()
  @Query(() => DisponibilidadEnfermero, {
    name: 'disponibilidadEnfermero',
    description: 'Busca un bloque de disponibilidad de enfermero por ID',
  })
  findOne(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<DisponibilidadEnfermero> {
    return this.dispService.findOne(id);
  }

  @Auth(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => DisponibilidadEnfermero, {
    description: 'Actualiza un bloque de disponibilidad de enfermero',
  })
  updateDisponibilidadEnfermero(
    @Args('input') input: UpdateDisponibilidadEnfermeroInput,
  ): Promise<DisponibilidadEnfermero> {
    return this.dispService.update(input);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => DisponibilidadEnfermero, {
    description:
      'Elimina permanentemente un bloque de disponibilidad de enfermero',
  })
  removeDisponibilidadEnfermero(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<DisponibilidadEnfermero> {
    return this.dispService.remove(id);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Int, {
    description:
      'Desactiva todos los bloques de disponibilidad de un enfermero',
  })
  deactivateAllDisponibilidadesEnfermero(
    @Args('enfermeroId', { type: () => ID }) enfermeroId: string,
  ): Promise<number> {
    return this.dispService.deactivateAll(enfermeroId);
  }
}
