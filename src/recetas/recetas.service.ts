import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateRecetaInput } from './dto/create-receta.input';
import { UpdateRecetaInput } from './dto/update-receta.input';
import { Receta } from './entities/receta.entity';

@Injectable()
export class RecetasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRecetaInput): Promise<Receta> {
    const receta = await this.prisma.recetas.create({
      data: {
        historial_id: input.historialId,
        medicamento_id: input.medicamentoId,
        dosis: input.dosis,
        frecuencia: input.frecuencia,
        duracion_dias: input.duracionDias,
        observaciones: input.observaciones,
      },
    });
    return this.mapToEntity(receta);
  }

  /** Obtiene todas las recetas de un historial médico */
  async findByHistorial(historialId: string): Promise<Receta[]> {
    const recetas = await this.prisma.recetas.findMany({
      where: { historial_id: historialId },
      orderBy: { id: 'asc' },
    });
    return recetas.map((r) => this.mapToEntity(r));
  }

  async findOne(id: number): Promise<Receta> {
    const receta = await this.prisma.recetas.findUnique({ where: { id } });
    if (!receta) throw new NotFoundException(`Receta con ID "${id}" no encontrada`);
    return this.mapToEntity(receta);
  }

  async update(id: number, input: UpdateRecetaInput): Promise<Receta> {
    await this.findOne(id);
    const updated = await this.prisma.recetas.update({
      where: { id },
      data: {
        ...(input.medicamentoId !== undefined && { medicamento_id: input.medicamentoId }),
        ...(input.dosis !== undefined && { dosis: input.dosis }),
        ...(input.frecuencia !== undefined && { frecuencia: input.frecuencia }),
        ...(input.duracionDias !== undefined && { duracion_dias: input.duracionDias }),
        ...(input.observaciones !== undefined && { observaciones: input.observaciones }),
      },
    });
    return this.mapToEntity(updated);
  }

  async remove(id: number): Promise<Receta> {
    const receta = await this.findOne(id);
    await this.prisma.recetas.delete({ where: { id } });
    return receta;
  }

  private mapToEntity(r: {
    id: number;
    historial_id: string;
    medicamento_id: number;
    dosis: string | null;
    frecuencia: string | null;
    duracion_dias: number | null;
    observaciones: string | null;
  }): Receta {
    return {
      id: r.id,
      historialId: r.historial_id,
      medicamentoId: r.medicamento_id,
      dosis: r.dosis ?? undefined,
      frecuencia: r.frecuencia ?? undefined,
      duracionDias: r.duracion_dias ?? undefined,
      observaciones: r.observaciones ?? undefined,
    };
  }
}
