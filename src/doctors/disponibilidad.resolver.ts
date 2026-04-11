import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { DisponibilidadService } from './disponibilidad.service';
import { DisponibilidadMedico } from './entities/disponibilidad-medico.entity';
import { CreateDisponibilidadInput } from './dto/create-disponibilidad.input';
import { UpdateDisponibilidadInput } from './dto/update-disponibilidad.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

@Resolver(() => DisponibilidadMedico)
export class DisponibilidadResolver {
  constructor(private readonly disponibilidadService: DisponibilidadService) {}

  /**
   * Crea un bloque de disponibilidad para un médico.
   * Un médico puede tener múltiples bloques por día (ej. mañana y tarde).
   * Solo MEDICO y ADMIN pueden gestionar la agenda — un paciente no debe poder
   * crear ni modificar horarios médicos.
   */
  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN)
  @Mutation(() => DisponibilidadMedico, {
    description: 'Crea un bloque de disponibilidad horaria para un médico',
  })
  createDisponibilidad(
    @Args('input') input: CreateDisponibilidadInput,
  ): Promise<DisponibilidadMedico> {
    return this.disponibilidadService.create(input);
  }

  /**
   * Lista todos los bloques de disponibilidad de un médico.
   * Cualquier usuario autenticado puede consultar horarios (ej. paciente al agendar cita).
   */
  @Auth()
  @Query(() => [DisponibilidadMedico], {
    name: 'disponibilidadesByDoctor',
    description: 'Retorna todos los bloques de disponibilidad de un médico, ordenados por día y hora',
  })
  findByDoctor(
    @Args('medicoId', { type: () => ID }) medicoId: string,
  ): Promise<DisponibilidadMedico[]> {
    return this.disponibilidadService.findByDoctor(medicoId);
  }

  /** Obtiene un bloque de disponibilidad por ID — acceso para cualquier rol autenticado */
  @Auth()
  @Query(() => DisponibilidadMedico, {
    name: 'disponibilidad',
    description: 'Busca un bloque de disponibilidad por su ID',
  })
  findOne(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<DisponibilidadMedico> {
    return this.disponibilidadService.findOne(id);
  }

  /**
   * Actualiza un bloque de disponibilidad.
   * Útil para cambiar horarios o desactivar un bloque sin eliminarlo.
   */
  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN)
  @Mutation(() => DisponibilidadMedico, {
    description: 'Actualiza horarios o estado activo de un bloque de disponibilidad',
  })
  updateDisponibilidad(
    @Args('input') input: UpdateDisponibilidadInput,
  ): Promise<DisponibilidadMedico> {
    return this.disponibilidadService.update(input);
  }

  /** Elimina permanentemente un bloque de disponibilidad */
  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN)
  @Mutation(() => DisponibilidadMedico, {
    description: 'Elimina un bloque de disponibilidad del médico',
  })
  removeDisponibilidad(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<DisponibilidadMedico> {
    return this.disponibilidadService.remove(id);
  }

  /** Desactiva todos los bloques de un médico sin eliminarlos */
  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN)
  @Mutation(() => Int, {
    description: 'Desactiva todos los bloques de disponibilidad de un médico',
  })
  deactivateAllDisponibilidades(
    @Args('medicoId', { type: () => ID }) medicoId: string,
  ): Promise<number> {
    return this.disponibilidadService.deactivateAll(medicoId);
  }
}

// Daniel Useche
