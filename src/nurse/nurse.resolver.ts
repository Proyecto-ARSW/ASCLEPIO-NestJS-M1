import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { NurseService } from './nurse.service';
import { Nurse } from './entities/nurse.entity';
import { CreateNurseInput } from './dto/create-nurse.input';
import { UpdateNurseInput } from './dto/update-nurse.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

/**
 * Flujo de enfermeros:
 *  1. Los enfermeros se crean en dos vías:
 *     a) POST /auth/register con rol=ENFERMERO (crea usuario + perfil en una sola llamada).
 *     b) Mutation createNurse (vincula un usuario existente a un perfil de enfermero — útil
 *        cuando el ADMIN crea el usuario por separado y luego asigna el perfil).
 *  2. ADMIN puede actualizar o dar de baja (activo=false) a un enfermero.
 *  3. Cualquier usuario autenticado puede consultar el listado y un enfermero por ID.
 */
@Resolver(() => Nurse)
export class NurseResolver {
  constructor(private readonly nurseService: NurseService) {}

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Nurse, {
    description: 'Vincula un perfil de enfermero a un usuario existente (ADMIN)',
  })
  createNurse(@Args('input') input: CreateNurseInput): Promise<Nurse> {
    return this.nurseService.create(input);
  }

  @Auth()
  @Query(() => [Nurse], {
    name: 'nurses',
    description: 'Lista todos los enfermeros activos',
  })
  findAll(): Promise<Nurse[]> {
    return this.nurseService.findAll();
  }

  @Auth()
  @Query(() => Nurse, {
    name: 'nurse',
    description: 'Busca un enfermero por su ID',
  })
  findOne(
    @Args('id', { type: () => ID, description: 'ID del enfermero' }) id: string,
  ): Promise<Nurse> {
    return this.nurseService.findOne(id);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Nurse, {
    description: 'Actualiza los datos de un enfermero (ADMIN)',
  })
  updateNurse(@Args('input') input: UpdateNurseInput): Promise<Nurse> {
    return this.nurseService.update(input.id, input);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Nurse, {
    description: 'Da de baja lógicamente a un enfermero (activo=false) (ADMIN)',
  })
  removeNurse(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Nurse> {
    return this.nurseService.remove(id);
  }
}
