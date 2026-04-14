import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { MedicinesService } from './medicines.service';
import { Medicine } from './entities/medicine.entity';
import { CreateMedicineInput } from './dto/create-medicine.input';
import { UpdateMedicineInput } from './dto/update-medicine.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

/**
 * Flujo de medicamentos:
 *  1. ADMIN crea / actualiza / da de baja (activo=false) medicamentos del catálogo.
 *  2. Cualquier usuario autenticado puede consultar el catálogo.
 *  3. La baja es lógica (activo=false); el medicamento permanece en BD para historial de recetas.
 *  4. Al crear un medicamento se puede asociar a una categoría (categoriaId).
 */
@Resolver(() => Medicine)
export class MedicinesResolver {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Medicine, {
    description: 'Crea un medicamento en el catálogo (ADMIN)',
  })
  createMedicine(@Args('input') input: CreateMedicineInput): Promise<Medicine> {
    return this.medicinesService.create(input);
  }

  @Auth()
  @Query(() => [Medicine], {
    name: 'medicines',
    description: 'Lista medicamentos del catálogo. Por defecto solo activos.',
  })
  findAll(
    @Args('soloActivos', {
      type: () => Boolean,
      nullable: true,
      defaultValue: true,
    })
    soloActivos: boolean,
  ): Promise<Medicine[]> {
    return this.medicinesService.findAll(soloActivos);
  }

  @Auth()
  @Query(() => Medicine, {
    name: 'medicine',
    description: 'Busca un medicamento por ID',
  })
  findOne(@Args('id', { type: () => Int }) id: number): Promise<Medicine> {
    return this.medicinesService.findOne(id);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Medicine, {
    description: 'Actualiza un medicamento del catálogo (ADMIN)',
  })
  updateMedicine(@Args('input') input: UpdateMedicineInput): Promise<Medicine> {
    return this.medicinesService.update(input.id, input);
  }

  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Medicine, {
    description:
      'Da de baja lógicamente un medicamento (activo=false). (ADMIN)',
  })
  removeMedicine(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<Medicine> {
    return this.medicinesService.remove(id);
  }
}
