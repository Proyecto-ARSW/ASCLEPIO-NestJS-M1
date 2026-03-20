import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateNurseInput } from './dto/create-nurse.input';
import { UpdateNurseInput } from './dto/update-nurse.input';
import { Nurse } from './entities/nurse.entity';

const includeUsuario = { usuarios: true } as const;

@Injectable()
export class NurseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNurseInput): Promise<Nurse> {
    const existing = await this.prisma.enfermeros.findUnique({
      where: { numero_registro: input.numeroRegistro },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un enfermero con el número de registro "${input.numeroRegistro}"`,
      );
    }

    const enfermero = await this.prisma.enfermeros.create({
      data: {
        usuario_id: input.usuarioId,
        numero_registro: input.numeroRegistro,
        nivel_formacion: input.nivelFormacion,
        area_especializacion: input.areaEspecializacion,
        certificacion_triage: input.certificacionTriage ?? false,
        fecha_certificacion: input.fechaCertificacion,
      },
      include: includeUsuario,
    });

    return this.mapToEntity(enfermero);
  }

  async findAll(): Promise<Nurse[]> {
    const enfermeros = await this.prisma.enfermeros.findMany({
      where: { activo: true },
      orderBy: { creado_en: 'desc' },
      include: includeUsuario,
    });
    return enfermeros.map((e) => this.mapToEntity(e));
  }

  async findOne(id: string): Promise<Nurse> {
    const enfermero = await this.prisma.enfermeros.findUnique({
      where: { id },
      include: includeUsuario,
    });
    if (!enfermero) {
      throw new NotFoundException(`Enfermero con ID "${id}" no encontrado`);
    }
    return this.mapToEntity(enfermero);
  }

  async update(id: string, input: UpdateNurseInput): Promise<Nurse> {
    await this.findOne(id);

    if (input.numeroRegistro) {
      const conflict = await this.prisma.enfermeros.findFirst({
        where: { numero_registro: input.numeroRegistro, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `El número de registro "${input.numeroRegistro}" ya está en uso por otro enfermero`,
        );
      }
    }

    const updated = await this.prisma.enfermeros.update({
      where: { id },
      data: {
        ...(input.numeroRegistro && { numero_registro: input.numeroRegistro }),
        ...(input.nivelFormacion && { nivel_formacion: input.nivelFormacion }),
        ...(input.areaEspecializacion && { area_especializacion: input.areaEspecializacion }),
        ...(input.certificacionTriage !== undefined && {
          certificacion_triage: input.certificacionTriage,
        }),
        ...(input.fechaCertificacion !== undefined && {
          fecha_certificacion: input.fechaCertificacion,
        }),
      },
      include: includeUsuario,
    });

    return this.mapToEntity(updated);
  }

  /** Baja lógica */
  async remove(id: string): Promise<Nurse> {
    await this.findOne(id);
    const deactivated = await this.prisma.enfermeros.update({
      where: { id },
      data: { activo: false },
      include: includeUsuario,
    });
    return this.mapToEntity(deactivated);
  }

  private mapToEntity(record: {
    id: string;
    usuario_id: string;
    numero_registro: string;
    nivel_formacion: number;
    area_especializacion: number;
    certificacion_triage: boolean;
    fecha_certificacion: Date | null;
    activo: boolean;
    creado_en: Date;
    usuarios: {
      nombre: string;
      apellido: string;
      email: string;
      telefono: string | null;
    };
  }): Nurse {
    return {
      id: record.id,
      usuarioId: record.usuario_id,
      nombre: record.usuarios.nombre,
      apellido: record.usuarios.apellido,
      email: record.usuarios.email,
      telefono: record.usuarios.telefono ?? undefined,
      numeroRegistro: record.numero_registro,
      nivelFormacion: record.nivel_formacion,
      areaEspecializacion: record.area_especializacion,
      certificacionTriage: record.certificacion_triage,
      fechaCertificacion: record.fecha_certificacion ?? undefined,
      activo: record.activo,
      creadoEn: record.creado_en,
    };
  }
}
