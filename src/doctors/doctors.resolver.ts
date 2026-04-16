import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { DoctorsService } from './doctors.service';
import { Doctor } from './entities/doctor.entity';
import { CreateDoctorInput } from './dto/create-doctor.input';
import { UpdateDoctorInput } from './dto/update-doctor.input';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

@Resolver(() => Doctor)
export class DoctorsResolver {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Mutation(() => Doctor, {
    description:
      'Vincula un perfil de médico a un usuario existente (requiere usuarioId)',
  })
  createDoctor(@Args('input') input: CreateDoctorInput): Promise<Doctor> {
    return this.doctorsService.create(input);
  }

  @Mutation(() => Doctor, {
    description: 'Actualiza los datos de un médico existente',
  })
  updateDoctor(@Args('input') input: UpdateDoctorInput): Promise<Doctor> {
    return this.doctorsService.update(input.id, input);
  }

  @Mutation(() => Doctor, {
    description: 'Desactiva un médico del sistema (soft delete)',
  })
  removeDoctor(
    @Args('id', { type: () => ID, description: 'ID del médico a desactivar' })
    id: string,
  ): Promise<Doctor> {
    return this.doctorsService.remove(id);
  }

  @Auth()
  @Query(() => [Doctor], {
    name: 'doctors',
    description:
      'Retorna médicos activos; opcionalmente filtrados por hospital',
  })
  findAll(
    @Args('hospitalId', {
      type: () => Int,
      nullable: true,
      description: 'ID del hospital para filtrar médicos vinculados',
    })
    hospitalId?: number,
  ): Promise<Doctor[]> {
    return this.doctorsService.findAll(hospitalId);
  }

  @Query(() => Doctor, {
    name: 'doctor',
    description: 'Busca un médico por su ID',
  })
  findOne(
    @Args('id', { type: () => ID, description: 'ID del médico' }) id: string,
  ): Promise<Doctor> {
    return this.doctorsService.findOne(id);
  }

  private resolveHospitalId(
    user: JwtPayload,
    hospitalIdArg?: number,
  ): number | undefined {
    if (hospitalIdArg !== undefined) {
      if (user.rol !== RolUsuario.ADMIN && user.hospitalId !== hospitalIdArg) {
        throw new ForbiddenException(
          'No tienes permisos para consultar médicos de otro hospital',
        );
      }
      return hospitalIdArg;
    }

    if (user.hospitalId !== undefined) {
      return user.hospitalId;
    }

    if (user.rol === RolUsuario.ADMIN) {
      return undefined;
    }

    throw new BadRequestException(
      'El usuario autenticado no tiene hospital asignado',
    );
  }
}

// Daniel Useche
