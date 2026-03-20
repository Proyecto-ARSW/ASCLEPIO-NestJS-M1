import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { InventarioService } from './inventario.service';
import { InventarioMedicamento } from './entities/inventario-medicamento.entity';
import { CreateInventarioInput } from './dto/create-inventario.input';
import { UpdateInventarioInput } from './dto/update-inventario.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

/**
 * Flujo de inventario de medicamentos:
 *  1. ADMIN o RECEPCIONISTA crean el registro de inventario de un medicamento en una sede.
 *  2. El trigger `trg_disponibilidad_medicamento` calcula automáticamente `disponibilidad`
 *     y `actualizado_en` en cada INSERT o UPDATE.
 *  3. Para abastecer: updateInventario con el nuevo stockActual.
 *  4. La consulta puede hacerse por sede, por medicamento o general.
 */
@Resolver(() => InventarioMedicamento)
export class InventarioResolver {
  constructor(private readonly inventarioService: InventarioService) {}

  @Auth(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => InventarioMedicamento, {
    description: 'Registra un medicamento en el inventario de una sede (ADMIN/RECEPCIONISTA)',
  })
  createInventario(@Args('input') input: CreateInventarioInput): Promise<InventarioMedicamento> {
    return this.inventarioService.create(input);
  }

  @Auth()
  @Query(() => [InventarioMedicamento], {
    name: 'inventario',
    description: 'Lista todo el inventario de medicamentos',
  })
  findAll(): Promise<InventarioMedicamento[]> {
    return this.inventarioService.findAll();
  }

  @Auth()
  @Query(() => [InventarioMedicamento], {
    name: 'inventarioBySede',
    description: 'Inventario de medicamentos de una sede específica',
  })
  findBySede(@Args('sedeId', { type: () => Int }) sedeId: number): Promise<InventarioMedicamento[]> {
    return this.inventarioService.findBySede(sedeId);
  }

  @Auth()
  @Query(() => [InventarioMedicamento], {
    name: 'inventarioByMedicamento',
    description: 'Inventario de un medicamento en todas las sedes',
  })
  findByMedicamento(
    @Args('medicamentoId', { type: () => Int }) medicamentoId: number,
  ): Promise<InventarioMedicamento[]> {
    return this.inventarioService.findByMedicamento(medicamentoId);
  }

  @Auth()
  @Query(() => InventarioMedicamento, {
    name: 'inventarioItem',
    description: 'Busca un registro de inventario por ID',
  })
  findOne(@Args('id', { type: () => Int }) id: number): Promise<InventarioMedicamento> {
    return this.inventarioService.findOne(id);
  }

  @Auth(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => InventarioMedicamento, {
    description:
      'Actualiza stock o precio de un medicamento en una sede. El trigger recalcula disponibilidad automáticamente.',
  })
  updateInventario(@Args('input') input: UpdateInventarioInput): Promise<InventarioMedicamento> {
    return this.inventarioService.update(input.id, input);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => InventarioMedicamento, {
    description: 'Elimina un registro de inventario (ADMIN)',
  })
  removeInventario(@Args('id', { type: () => Int }) id: number): Promise<InventarioMedicamento> {
    return this.inventarioService.remove(id);
  }
}
