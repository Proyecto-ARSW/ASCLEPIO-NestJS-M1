import { Injectable } from '@nestjs/common';
import { CreateAppoinmentInput } from './dto/create-appoinment.input';
import { UpdateAppoinmentInput } from './dto/update-appoinment.input';

@Injectable()
export class AppoinmentsService {
  create(createAppoinmentInput: CreateAppoinmentInput) {
    return 'This action adds a new appoinment';
  }

  findAll() {
    return `This action returns all appoinments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} appoinment`;
  }

  update(id: number, updateAppoinmentInput: UpdateAppoinmentInput) {
    return `This action updates a #${id} appoinment`;
  }

  remove(id: number) {
    return `This action removes a #${id} appoinment`;
  }
}
