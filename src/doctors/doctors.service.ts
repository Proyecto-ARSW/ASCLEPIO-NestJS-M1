import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateDoctorInput } from './dto/create-doctor.input';
import { UpdateDoctorInput } from './dto/update-doctor.input';
import { Doctor } from './entities/doctor.entity';

const includeUsuario = { usuarios: true } as const;

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDoctorInput): Promise<Doctor> {
    const existing = await this.prisma.medicos.findUnique({
      where: { numero_registro: input.numeroRegistro },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un médico con el número de registro "${input.numeroRegistro}"`,
      );
    }

    const doctor = await this.prisma.medicos.create({
      data: {
        usuario_id: input.usuarioId,
        especialidad_id: input.especialidadId,
        numero_registro: input.numeroRegistro,
        consultorio: input.consultorio,
      },
      include: includeUsuario,
    });

    return this.mapToEntity(doctor);
  }

  async findAll(hospitalId?: number): Promise<Doctor[]> {
    const doctors = await this.prisma.medicos.findMany({
      where: {
        activo: true,
        ...(hospitalId && {
          usuarios: {
            hospital_usuario: { some: { hospital_id: hospitalId } },
          },
        }),
      },
      orderBy: { creado_en: 'desc' },
      include: includeUsuario,
    });

    return doctors.map((d) => this.mapToEntity(d));
  }

  async findOne(id: string): Promise<Doctor> {
    const doctor = await this.prisma.medicos.findUnique({
      where: { id },
      include: includeUsuario,
    });

    if (!doctor) {
      throw new NotFoundException(`Médico con ID "${id}" no encontrado`);
    }

    return this.mapToEntity(doctor);
  }

  async update(id: string, input: UpdateDoctorInput): Promise<Doctor> {
    await this.findOne(id);

    if (input.numeroRegistro) {
      const conflict = await this.prisma.medicos.findFirst({
        where: {
          numero_registro: input.numeroRegistro,
          NOT: { id },
        },
      });

      if (conflict) {
        throw new ConflictException(
          `El número de registro "${input.numeroRegistro}" ya está en uso por otro médico`,
        );
      }
    }

    const updated = await this.prisma.medicos.update({
      where: { id },
      data: {
        ...(input.usuarioId && { usuario_id: input.usuarioId }),
        ...(input.especialidadId && { especialidad_id: input.especialidadId }),
        ...(input.numeroRegistro && { numero_registro: input.numeroRegistro }),
        ...(input.consultorio !== undefined && {
          consultorio: input.consultorio,
        }),
      },
      include: includeUsuario,
    });

    return this.mapToEntity(updated);
  }

  async remove(id: string): Promise<Doctor> {
    await this.findOne(id);

    const deactivated = await this.prisma.medicos.update({
      where: { id },
      data: { activo: false },
      include: includeUsuario,
    });

    return this.mapToEntity(deactivated);
  }

  private mapToEntity(record: {
    id: string;
    usuario_id: string;
    especialidad_id: number;
    numero_registro: string;
    consultorio: string | null;
    activo: boolean;
    creado_en: Date;
    usuarios: {
      nombre: string;
      apellido: string;
      email: string;
      telefono: string | null;
    };
  }): Doctor {
    return {
      id: record.id,
      usuarioId: record.usuario_id,
      nombre: record.usuarios.nombre,
      apellido: record.usuarios.apellido,
      email: record.usuarios.email,
      telefono: record.usuarios.telefono ?? undefined,
      especialidadId: record.especialidad_id,
      numeroRegistro: record.numero_registro,
      consultorio: record.consultorio ?? undefined,
      activo: record.activo,
      creadoEn: record.creado_en,
    };
  }
}
