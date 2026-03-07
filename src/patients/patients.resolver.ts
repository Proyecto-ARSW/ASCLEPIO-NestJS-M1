import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PatientsService } from './patients.service';
import { Patient } from './entities/patient.entity';
import { CreatePatientInput } from './dto/create-patient.input';
import { UpdatePatientInput } from './dto/update-patient.input';

@Resolver(() => Patient)
export class PatientsResolver {
  constructor(private readonly patientsService: PatientsService) {}

  @Mutation(() => Patient, {
    description: 'Vincula un perfil de paciente a un usuario existente',
  })
  createPatient(@Args('input') input: CreatePatientInput): Promise<Patient> {
    return this.patientsService.create(input);
  }

  @Mutation(() => Patient, {
    description: 'Actualiza los datos de un paciente existente',
  })
  updatePatient(@Args('input') input: UpdatePatientInput): Promise<Patient> {
    return this.patientsService.update(input.id, input);
  }

  @Mutation(() => Patient, {
    description: 'Elimina un paciente del sistema',
  })
  removePatient(
    @Args('id', { type: () => ID, description: 'ID del paciente a eliminar' })
    id: string,
  ): Promise<Patient> {
    return this.patientsService.remove(id);
  }

  @Query(() => [Patient], {
    name: 'patients',
    description: 'Retorna todos los pacientes registrados',
  })
  findAll(): Promise<Patient[]> {
    return this.patientsService.findAll();
  }

  @Query(() => Patient, {
    name: 'patient',
    description: 'Busca un paciente por su ID',
  })
  findOne(
    @Args('id', { type: () => ID, description: 'ID del paciente' }) id: string,
  ): Promise<Patient> {
    return this.patientsService.findOne(id);
  }
}
