import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { DoctorsService } from './doctors.service';
import { Doctor } from './entities/doctor.entity';
import { CreateDoctorInput } from './dto/create-doctor.input';
import { UpdateDoctorInput } from './dto/update-doctor.input';

@Resolver(() => Doctor)
export class DoctorsResolver {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Mutation(() => Doctor)
  createDoctor(@Args('createDoctorInput') createDoctorInput: CreateDoctorInput) {
    return this.doctorsService.create(createDoctorInput);
  }

  @Query(() => [Doctor], { name: 'doctors' })
  findAll() {
    return this.doctorsService.findAll();
  }

  @Query(() => Doctor, { name: 'doctor' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.doctorsService.findOne(id);
  }

  @Mutation(() => Doctor)
  updateDoctor(@Args('updateDoctorInput') updateDoctorInput: UpdateDoctorInput) {
    return this.doctorsService.update(updateDoctorInput.id, updateDoctorInput);
  }

  @Mutation(() => Doctor)
  removeDoctor(@Args('id', { type: () => Int }) id: number) {
    return this.doctorsService.remove(id);
  }
}
