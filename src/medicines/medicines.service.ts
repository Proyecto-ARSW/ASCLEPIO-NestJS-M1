import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateMedicineInput } from './dto/create-medicine.input';
import { UpdateMedicineInput } from './dto/update-medicine.input';
import { Medicine } from './entities/medicine.entity';

@Injectable()
export class MedicinesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Medicamentos ─────────────────────────────────────────────────────────────

  async create(input: CreateMedicineInput): Promise<Medicine> {
    const med = await this.prisma.medicamentos.create({
      data: {
        nombre_comercial: input.nombreComercial,
        nombre_generico: input.nombreGenerico,
        categoria_id: input.categoriaId,
        descripcion: input.descripcion,
        indicaciones: input.indicaciones,
        contraindicaciones: input.contraindicaciones,
        presentacion: input.presentacion,
        requiere_receta: input.requiereReceta ?? true,
      },
    });
    return this.mapToEntity(med);
  }

  async findAll(soloActivos = true, busqueda?: string): Promise<Medicine[]> {
    const meds = await this.prisma.medicamentos.findMany({
      where: {
        ...(soloActivos ? { activo: true } : {}),
        ...(busqueda
          ? {
              OR: [
                {
                  nombre_comercial: {
                    contains: busqueda,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  nombre_generico: {
                    contains: busqueda,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { nombre_comercial: 'asc' },
    });
    return meds.map((m) => this.mapToEntity(m));
  }

  async findOne(id: number): Promise<Medicine> {
    const med = await this.prisma.medicamentos.findUnique({ where: { id } });
    if (!med)
      throw new NotFoundException(`Medicamento con ID "${id}" no encontrado`);
    return this.mapToEntity(med);
  }

  async update(id: number, input: UpdateMedicineInput): Promise<Medicine> {
    await this.findOne(id);
    const updated = await this.prisma.medicamentos.update({
      where: { id },
      data: {
        ...(input.nombreComercial !== undefined && {
          nombre_comercial: input.nombreComercial,
        }),
        ...(input.nombreGenerico !== undefined && {
          nombre_generico: input.nombreGenerico,
        }),
        ...(input.categoriaId !== undefined && {
          categoria_id: input.categoriaId,
        }),
        ...(input.descripcion !== undefined && {
          descripcion: input.descripcion,
        }),
        ...(input.indicaciones !== undefined && {
          indicaciones: input.indicaciones,
        }),
        ...(input.contraindicaciones !== undefined && {
          contraindicaciones: input.contraindicaciones,
        }),
        ...(input.presentacion !== undefined && {
          presentacion: input.presentacion,
        }),
        ...(input.requiereReceta !== undefined && {
          requiere_receta: input.requiereReceta,
        }),
      },
    });
    return this.mapToEntity(updated);
  }

  /** Baja lógica: activo = false */
  async remove(id: number): Promise<Medicine> {
    await this.findOne(id);
    const deactivated = await this.prisma.medicamentos.update({
      where: { id },
      data: { activo: false },
    });
    return this.mapToEntity(deactivated);
  }

  private mapToEntity(r: {
    id: number;
    nombre_comercial: string;
    nombre_generico: string | null;
    categoria_id: number | null;
    descripcion: string | null;
    indicaciones: string | null;
    contraindicaciones: string | null;
    presentacion: string | null;
    requiere_receta: boolean;
    activo: boolean;
    creado_en: Date;
  }): Medicine {
    return {
      id: r.id,
      nombreComercial: r.nombre_comercial,
      nombreGenerico: r.nombre_generico ?? undefined,
      categoriaId: r.categoria_id ?? undefined,
      descripcion: r.descripcion ?? undefined,
      indicaciones: r.indicaciones ?? undefined,
      contraindicaciones: r.contraindicaciones ?? undefined,
      presentacion: r.presentacion ?? undefined,
      requiereReceta: r.requiere_receta,
      activo: r.activo,
      creadoEn: r.creado_en,
    };
  }
}
