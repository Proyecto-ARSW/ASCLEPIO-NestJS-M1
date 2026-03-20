import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CategoriaMedicamentoService } from './categoria-medicamento.service';
import { CategoriaMedicamento } from './entities/categoria-medicamento.entity';
import { CreateCategoriaInput } from './dto/create-categoria.input';
import { UpdateCategoriaInput } from './dto/update-categoria.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

/**
 * Flujo de categorías de medicamentos:
 *  1. ADMIN gestiona (crea / actualiza / elimina) las categorías del catálogo.
 *  2. Cualquier usuario autenticado puede consultar las categorías disponibles.
 *  3. La eliminación es física; si la categoría tiene medicamentos asociados,
 *     Prisma/PostgreSQL lanzará un error de FK (el medicamento no se borra).
 */
@Resolver(() => CategoriaMedicamento)
export class CategoriaMedicamentoResolver {
  constructor(private readonly categoriaService: CategoriaMedicamentoService) {}

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => CategoriaMedicamento, {
    description: 'Crea una nueva categoría de medicamento (ADMIN)',
  })
  createCategoriaMedicamento(
    @Args('input') input: CreateCategoriaInput,
  ): Promise<CategoriaMedicamento> {
    return this.categoriaService.create(input);
  }

  @Auth()
  @Query(() => [CategoriaMedicamento], {
    name: 'categoriasMedicamento',
    description: 'Lista todas las categorías de medicamentos',
  })
  findAllCategorias(): Promise<CategoriaMedicamento[]> {
    return this.categoriaService.findAll();
  }

  @Auth()
  @Query(() => CategoriaMedicamento, {
    name: 'categoriaMedicamento',
    description: 'Busca una categoría de medicamento por ID',
  })
  findOneCategoria(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<CategoriaMedicamento> {
    return this.categoriaService.findOne(id);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => CategoriaMedicamento, {
    description: 'Actualiza el nombre de una categoría de medicamento (ADMIN)',
  })
  updateCategoriaMedicamento(
    @Args('input') input: UpdateCategoriaInput,
  ): Promise<CategoriaMedicamento> {
    return this.categoriaService.update(input.id, input);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => CategoriaMedicamento, {
    description: 'Elimina físicamente una categoría de medicamento (ADMIN). Falla si tiene medicamentos asociados.',
  })
  removeCategoriaMedicamento(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<CategoriaMedicamento> {
    return this.categoriaService.remove(id);
  }
}
