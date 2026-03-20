import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { RecetasService } from './recetas.service';
import { Receta } from './entities/receta.entity';
import { CreateRecetaInput } from './dto/create-receta.input';
import { UpdateRecetaInput } from './dto/update-receta.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

/**
 * Flujo de recetas médicas:
 *  1. El MEDICO crea una receta asociada a un historial_medico (historialId).
 *     Este historial debe existir previamente (se crea en el módulo Historial).
 *  2. Los medicamentos recetados deben existir en el catálogo (medicamentos).
 *  3. Si el medicamento `requiere_receta = true`, el sistema valida que haya
 *     una receta antes de despachar (regla a implementar en Inventario/Farmacia).
 *  4. MEDICO y ADMIN pueden crear y actualizar recetas.
 *  5. Las recetas NO se eliminan (inmutabilidad clínica); solo en casos excepcionales
 *     puede hacerlo el ADMIN.
 */
@Resolver(() => Receta)
export class RecetasResolver {
  constructor(private readonly recetasService: RecetasService) {}

  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN)
  @Mutation(() => Receta, {
    description: 'Crea una receta médica vinculada a un historial (MEDICO/ADMIN)',
  })
  createReceta(@Args('input') input: CreateRecetaInput): Promise<Receta> {
    return this.recetasService.create(input);
  }

  @Auth()
  @Query(() => [Receta], {
    name: 'recetasByHistorial',
    description: 'Lista las recetas médicas de un historial clínico',
  })
  findByHistorial(
    @Args('historialId', { type: () => ID }) historialId: string,
  ): Promise<Receta[]> {
    return this.recetasService.findByHistorial(historialId);
  }

  @Auth()
  @Query(() => Receta, {
    name: 'receta',
    description: 'Busca una receta por ID',
  })
  findOne(@Args('id', { type: () => Int }) id: number): Promise<Receta> {
    return this.recetasService.findOne(id);
  }

  @Auth(RolUsuario.MEDICO, RolUsuario.ADMIN)
  @Mutation(() => Receta, {
    description: 'Actualiza los datos de una receta médica (MEDICO/ADMIN)',
  })
  updateReceta(@Args('input') input: UpdateRecetaInput): Promise<Receta> {
    return this.recetasService.update(input.id, input);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Receta, {
    description: 'Elimina físicamente una receta (solo ADMIN, en casos excepcionales)',
  })
  removeReceta(@Args('id', { type: () => Int }) id: number): Promise<Receta> {
    return this.recetasService.remove(id);
  }
}
