import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { SedesService } from './sedes.service';
import { Sede } from './entities/sede.entity';
import { CreateSedeInput } from './dto/create-sede.input';
import { UpdateSedeInput } from './dto/update-sede.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

/**
 * Flujo de sedes:
 *  1. ADMIN crea las sedes del hospital.
 *  2. Cualquier usuario autenticado puede consultar las sedes disponibles.
 *  3. La eliminación física solo procede si la sede no tiene inventario asociado.
 */
@Resolver(() => Sede)
export class SedesResolver {
  constructor(private readonly sedesService: SedesService) {}

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Sede, { description: 'Crea una nueva sede (ADMIN)' })
  createSede(@Args('input') input: CreateSedeInput): Promise<Sede> {
    return this.sedesService.create(input);
  }

  @Auth()
  @Query(() => [Sede], { name: 'sedes', description: 'Lista todas las sedes' })
  findAll(): Promise<Sede[]> {
    return this.sedesService.findAll();
  }

  @Auth()
  @Query(() => Sede, { name: 'sede', description: 'Busca una sede por ID' })
  findOne(@Args('id', { type: () => Int }) id: number): Promise<Sede> {
    return this.sedesService.findOne(id);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Sede, {
    description: 'Actualiza los datos de una sede (ADMIN)',
  })
  updateSede(@Args('input') input: UpdateSedeInput): Promise<Sede> {
    return this.sedesService.update(input.id, input);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Sede, {
    description:
      'Elimina físicamente una sede (ADMIN). Falla si tiene inventario asociado.',
  })
  removeSede(@Args('id', { type: () => Int }) id: number): Promise<Sede> {
    return this.sedesService.remove(id);
  }
}
