import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { PatientsService } from './patients.service';
import { Patient } from './entities/patient.entity';
import { CreatePatientInput } from './dto/create-patient.input';
import { UpdatePatientInput } from './dto/update-patient.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

@Resolver(() => Patient)
export class PatientsResolver {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * Vincula perfil de paciente a un usuario.
   * Solo ADMIN y RECEPCIONISTA crean perfiles — evita que un usuario
   * se auto-asigne roles o duplicar perfiles de paciente.
   */
  @Auth(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => Patient, {
    description: 'Vincula un perfil de paciente a un usuario existente',
  })
  createPatient(@Args('input') input: CreatePatientInput): Promise<Patient> {
    return this.patientsService.create(input);
  }

  /**
   * Actualiza datos clínicos del paciente (alergias, tipo sangre, etc.).
   * MEDICO puede actualizar datos clínicos durante la consulta; ADMIN y RECEPCIONISTA
   * actualizan datos administrativos.
   */
  @Auth(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA, RolUsuario.MEDICO)
  @Mutation(() => Patient, {
    description: 'Actualiza los datos de un paciente existente',
  })
  updatePatient(@Args('input') input: UpdatePatientInput): Promise<Patient> {
    return this.patientsService.update(input.id, input);
  }

  /**
   * Elimina (o debería ser soft-delete) un paciente.
   * Solo ADMIN — la Resolución 1995/1999 Colombia exige conservar registros 20 años.
   */
  @Auth(RolUsuario.ADMIN)
  @Mutation(() => Patient, {
    description: 'Elimina un paciente del sistema',
  })
  removePatient(
    @Args('id', { type: () => ID, description: 'ID del paciente a eliminar' })
    id: string,
  ): Promise<Patient> {
    return this.patientsService.remove(id);
  }

  /**
   * Lista todos los pacientes — dato PHI sensible.
   * Solo personal clínico y administrativo puede ver el listado completo.
   */
  @Auth(
    RolUsuario.ADMIN,
    RolUsuario.MEDICO,
    RolUsuario.ENFERMERO,
    RolUsuario.RECEPCIONISTA,
  )
  @Query(() => [Patient], {
    name: 'patients',
    description: 'Retorna todos los pacientes registrados',
  })
  findAll(): Promise<Patient[]> {
    return this.patientsService.findAll();
  }

  /**
   * Lista pacientes vinculados a un hospital específico.
   * Usa la tabla hospital_usuario para filtrar por hospitalId.
   */
  @Auth(
    RolUsuario.ADMIN,
    RolUsuario.MEDICO,
    RolUsuario.ENFERMERO,
    RolUsuario.RECEPCIONISTA,
  )
  @Query(() => [Patient], {
    name: 'patientsByHospital',
    description:
      'Retorna los pacientes vinculados a un hospital específico',
  })
  findByHospital(
    @Args('hospitalId', { type: () => Int, description: 'ID del hospital' })
    hospitalId: number,
  ): Promise<Patient[]> {
    return this.patientsService.findByHospital(hospitalId);
  }

  /**
   * Busca un paciente por ID. Accesible a cualquier usuario autenticado:
   * el paciente puede consultar su propio perfil, el médico el de su paciente.
   */
  @Auth()
  @Query(() => Patient, {
    name: 'patient',
    description: 'Busca un paciente por su ID',
  })
  findOne(
    @Args('id', { type: () => ID, description: 'ID del paciente' }) id: string,
  ): Promise<Patient> {
    return this.patientsService.findOne(id);
  }

  /**
   * Devuelve el perfil de paciente del usuario autenticado.
   * Al usar @CurrentUser() en vez de leer `patients {}` completo, el PACIENTE
   * accede únicamente a su propio registro PHI — principio de mínimo privilegio.
   */
  @Auth()
  @Query(() => Patient, {
    name: 'myPatientProfile',
    nullable: true,
    description:
      'Perfil de paciente del usuario autenticado, o null si no tiene perfil',
  })
  myPatientProfile(@CurrentUser() user: JwtPayload): Promise<Patient | null> {
    return this.patientsService.findByUserId(user.sub);
  }
}

// Daniel Useche
