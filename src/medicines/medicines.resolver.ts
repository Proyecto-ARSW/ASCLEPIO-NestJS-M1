import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { MedicinesService } from './medicines.service';
import { Medicine } from './entities/medicine.entity';
import { CreateMedicineInput } from './dto/create-medicine.input';
import { UpdateMedicineInput } from './dto/update-medicine.input';

@Resolver(() => Medicine)
export class MedicinesResolver {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Mutation(() => Medicine)
  createMedicine(@Args('createMedicineInput') createMedicineInput: CreateMedicineInput) {
    return this.medicinesService.create(createMedicineInput);
  }

  @Query(() => [Medicine], { name: 'medicines' })
  findAll() {
    return this.medicinesService.findAll();
  }

  @Query(() => Medicine, { name: 'medicine' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.medicinesService.findOne(id);
  }

  @Mutation(() => Medicine)
  updateMedicine(@Args('updateMedicineInput') updateMedicineInput: UpdateMedicineInput) {
    return this.medicinesService.update(updateMedicineInput.id, updateMedicineInput);
  }

  @Mutation(() => Medicine)
  removeMedicine(@Args('id', { type: () => Int }) id: number) {
    return this.medicinesService.remove(id);
  }
}
