import { Injectable } from '@nestjs/common';
import { CreateMedicineInput } from './dto/create-medicine.input';
import { UpdateMedicineInput } from './dto/update-medicine.input';

@Injectable()
export class MedicinesService {
  create(createMedicineInput: CreateMedicineInput) {
    return 'This action adds a new medicine';
  }

  findAll() {
    return `This action returns all medicines`;
  }

  findOne(id: number) {
    return `This action returns a #${id} medicine`;
  }

  update(id: number, updateMedicineInput: UpdateMedicineInput) {
    return `This action updates a #${id} medicine`;
  }

  remove(id: number) {
    return `This action removes a #${id} medicine`;
  }
}
