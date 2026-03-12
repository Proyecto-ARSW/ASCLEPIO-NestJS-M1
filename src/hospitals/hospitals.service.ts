import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';

@Injectable()
export class HospitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHospitalDto) {
    if (dto.nit) {
      const existing = await this.prisma.hospitales.findUnique({
        where: { nit: dto.nit },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un hospital con NIT "${dto.nit}"`);
      }
    }

    return this.prisma.hospitales.create({
      data: {
        nombre: dto.nombre,
        nit: dto.nit,
        departamento: dto.departamento,
        ciudad: dto.ciudad,
        direccion: dto.direccion,
        telefono: dto.telefono,
        email_contacto: dto.emailContacto,
        tipo_institucion: dto.tipoInstitucion,
        capacidad_urgencias: dto.capacidadUrgencias,
        numero_consultorios: dto.numeroConsultorios,
        latitud: dto.latitud,
        longitud: dto.longitud,
        activo: dto.activo ?? true,
      },
    });
  }

  async findAll(soloActivos = false) {
    return this.prisma.hospitales.findMany({
      where: soloActivos ? { activo: true } : undefined,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        nit: true,
        departamento: true,
        ciudad: true,
        direccion: true,
        telefono: true,
        email_contacto: true,
        tipo_institucion: true,
        capacidad_urgencias: true,
        numero_consultorios: true,
        latitud: true,
        longitud: true,
        activo: true,
      },
    });
  }

  async findOne(id: number) {
    const hospital = await this.prisma.hospitales.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        nit: true,
        departamento: true,
        ciudad: true,
        direccion: true,
        telefono: true,
        email_contacto: true,
        tipo_institucion: true,
        capacidad_urgencias: true,
        numero_consultorios: true,
        latitud: true,
        longitud: true,
        activo: true,
      },
    });

    if (!hospital) {
      throw new NotFoundException(`Hospital con ID ${id} no encontrado`);
    }

    return hospital;
  }

  async update(id: number, dto: UpdateHospitalDto) {
    await this.findOne(id);

    if (dto.nit) {
      const conflict = await this.prisma.hospitales.findFirst({
        where: { nit: dto.nit, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(`El NIT "${dto.nit}" ya está en uso por otro hospital`);
      }
    }

    return this.prisma.hospitales.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.nit !== undefined && { nit: dto.nit }),
        ...(dto.departamento !== undefined && { departamento: dto.departamento }),
        ...(dto.ciudad !== undefined && { ciudad: dto.ciudad }),
        ...(dto.direccion !== undefined && { direccion: dto.direccion }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.emailContacto !== undefined && { email_contacto: dto.emailContacto }),
        ...(dto.tipoInstitucion !== undefined && { tipo_institucion: dto.tipoInstitucion }),
        ...(dto.capacidadUrgencias !== undefined && { capacidad_urgencias: dto.capacidadUrgencias }),
        ...(dto.numeroConsultorios !== undefined && { numero_consultorios: dto.numeroConsultorios }),
        ...(dto.latitud !== undefined && { latitud: dto.latitud }),
        ...(dto.longitud !== undefined && { longitud: dto.longitud }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.hospitales.delete({ where: { id } });
  }

  async toggleActivo(id: number) {
    const hospital = await this.findOne(id);
    return this.prisma.hospitales.update({
      where: { id },
      data: { activo: !hospital.activo },
    });
  }
}
