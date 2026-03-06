import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreatePatientInput } from './dto/create-patient.input';
import { UpdatePatientInput } from './dto/update-patient.input';
import { Patient } from './entities/patient.entity';

const includeUsuario = { usuarios: true } as const;

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePatientInput): Promise<Patient> {
    if (input.numeroDocumento) {
      const existing = await this.prisma.pacientes.findUnique({
        where: { numero_documento: input.numeroDocumento },
      });

      if (existing) {
        throw new ConflictException(
          `Ya existe un paciente con el número de documento "${input.numeroDocumento}"`,
        );
      }
    }

    const patient = await this.prisma.pacientes.create({
      data: {
        usuario_id: input.usuarioId,
        fecha_nacimiento: input.fechaNacimiento,
        tipo_sangre: input.tipoSangre,
        numero_documento: input.numeroDocumento,
        tipo_documento: input.tipoDocumento ?? 'CC',
        eps: input.eps,
        alergias: input.alergias,
        antecedentes: input.antecedentes,
      },
      include: includeUsuario,
    });

    return this.mapToEntity(patient);
  }

  async findAll(): Promise<Patient[]> {
    const patients = await this.prisma.pacientes.findMany({
      orderBy: { creado_en: 'desc' },
      include: includeUsuario,
    });

    return patients.map((p) => this.mapToEntity(p));
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.prisma.pacientes.findUnique({
      where: { id },
      include: includeUsuario,
    });

    if (!patient) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado`);
    }

    return this.mapToEntity(patient);
  }

  async update(id: string, input: UpdatePatientInput): Promise<Patient> {
    await this.findOne(id);

    if (input.numeroDocumento) {
      const conflict = await this.prisma.pacientes.findFirst({
        where: {
          numero_documento: input.numeroDocumento,
          NOT: { id },
        },
      });

      if (conflict) {
        throw new ConflictException(
          `El número de documento "${input.numeroDocumento}" ya está en uso por otro paciente`,
        );
      }
    }

    const updated = await this.prisma.pacientes.update({
      where: { id },
      data: {
        ...(input.usuarioId && { usuario_id: input.usuarioId }),
        ...(input.fechaNacimiento !== undefined && {
          fecha_nacimiento: input.fechaNacimiento,
        }),
        ...(input.tipoSangre !== undefined && { tipo_sangre: input.tipoSangre }),
        ...(input.numeroDocumento !== undefined && {
          numero_documento: input.numeroDocumento,
        }),
        ...(input.tipoDocumento !== undefined && {
          tipo_documento: input.tipoDocumento,
        }),
        ...(input.eps !== undefined && { eps: input.eps }),
        ...(input.alergias !== undefined && { alergias: input.alergias }),
        ...(input.antecedentes !== undefined && {
          antecedentes: input.antecedentes,
        }),
      },
      include: includeUsuario,
    });

    return this.mapToEntity(updated);
  }

  async remove(id: string): Promise<Patient> {
    await this.findOne(id);

    const deleted = await this.prisma.pacientes.delete({
      where: { id },
      include: includeUsuario,
    });

    return this.mapToEntity(deleted);
  }

  private mapToEntity(record: {
    id: string;
    usuario_id: string;
    fecha_nacimiento: Date | null;
    tipo_sangre: string | null;
    numero_documento: string | null;
    tipo_documento: string | null;
    eps: string | null;
    alergias: string | null;
    antecedentes: string | null;
    creado_en: Date;
    usuarios: {
      nombre: string;
      apellido: string;
      email: string;
      telefono: string | null;
    };
  }): Patient {
    return {
      id: record.id,
      usuarioId: record.usuario_id,
      nombre: record.usuarios.nombre,
      apellido: record.usuarios.apellido,
      email: record.usuarios.email,
      telefono: record.usuarios.telefono ?? undefined,
      fechaNacimiento: record.fecha_nacimiento ?? undefined,
      tipoSangre: record.tipo_sangre ?? undefined,
      numeroDocumento: record.numero_documento ?? undefined,
      tipoDocumento: record.tipo_documento ?? undefined,
      eps: record.eps ?? undefined,
      alergias: record.alergias ?? undefined,
      antecedentes: record.antecedentes ?? undefined,
      creadoEn: record.creado_en,
    };
  }
}
