import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateSedeInput } from './dto/create-sede.input';
import { UpdateSedeInput } from './dto/update-sede.input';
import { Sede } from './entities/sede.entity';

@Injectable()
export class SedesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSedeInput): Promise<Sede> {
    const sede = await this.prisma.sedes.create({
      data: {
        nombre: input.nombre,
        direccion: input.direccion,
        ciudad: input.ciudad,
      },
    });
    return this.mapToEntity(sede);
  }

  async findAll(): Promise<Sede[]> {
    const sedes = await this.prisma.sedes.findMany({
      orderBy: { nombre: 'asc' },
    });
    return sedes.map((s) => this.mapToEntity(s));
  }

  async findOne(id: number): Promise<Sede> {
    const sede = await this.prisma.sedes.findUnique({ where: { id } });
    if (!sede) throw new NotFoundException(`Sede con ID "${id}" no encontrada`);
    return this.mapToEntity(sede);
  }

  async update(id: number, input: UpdateSedeInput): Promise<Sede> {
    await this.findOne(id);
    const updated = await this.prisma.sedes.update({
      where: { id },
      data: {
        ...(input.nombre !== undefined && { nombre: input.nombre }),
        ...(input.direccion !== undefined && { direccion: input.direccion }),
        ...(input.ciudad !== undefined && { ciudad: input.ciudad }),
      },
    });
    return this.mapToEntity(updated);
  }

  async remove(id: number): Promise<Sede> {
    const sede = await this.findOne(id);
    await this.prisma.sedes.delete({ where: { id } });
    return sede;
  }

  private mapToEntity(r: {
    id: number;
    nombre: string;
    direccion: string | null;
    ciudad: string | null;
  }): Sede {
    return {
      id: r.id,
      nombre: r.nombre,
      direccion: r.direccion ?? undefined,
      ciudad: r.ciudad ?? undefined,
    };
  }
}
