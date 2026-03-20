import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateInventarioInput } from './dto/create-inventario.input';
import { UpdateInventarioInput } from './dto/update-inventario.input';
import { InventarioMedicamento, DisponibilidadMedicamento } from './entities/inventario-medicamento.entity';

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un registro de inventario.
   * El trigger `trg_disponibilidad_medicamento` de PostgreSQL calcula
   * automáticamente `disponibilidad` y `actualizado_en` en el INSERT.
   */
  async create(input: CreateInventarioInput): Promise<InventarioMedicamento> {
    const existing = await this.prisma.inventario_medicamentos.findUnique({
      where: {
        medicamento_id_sede_id: {
          medicamento_id: input.medicamentoId,
          sede_id: input.sedeId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un registro de inventario para el medicamento ${input.medicamentoId} en la sede ${input.sedeId}`,
      );
    }

    const inv = await this.prisma.inventario_medicamentos.create({
      data: {
        medicamento_id: input.medicamentoId,
        sede_id: input.sedeId,
        stock_actual: input.stockActual,
        stock_minimo: input.stockMinimo ?? 10,
        precio: input.precio ?? null,
      },
    });
    return this.mapToEntity(inv);
  }

  async findAll(): Promise<InventarioMedicamento[]> {
    const invs = await this.prisma.inventario_medicamentos.findMany({
      orderBy: [{ sede_id: 'asc' }, { medicamento_id: 'asc' }],
    });
    return invs.map((i) => this.mapToEntity(i));
  }

  async findBySede(sedeId: number): Promise<InventarioMedicamento[]> {
    const invs = await this.prisma.inventario_medicamentos.findMany({
      where: { sede_id: sedeId },
      orderBy: { medicamento_id: 'asc' },
    });
    return invs.map((i) => this.mapToEntity(i));
  }

  async findByMedicamento(medicamentoId: number): Promise<InventarioMedicamento[]> {
    const invs = await this.prisma.inventario_medicamentos.findMany({
      where: { medicamento_id: medicamentoId },
      orderBy: { sede_id: 'asc' },
    });
    return invs.map((i) => this.mapToEntity(i));
  }

  async findOne(id: number): Promise<InventarioMedicamento> {
    const inv = await this.prisma.inventario_medicamentos.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException(`Registro de inventario con ID "${id}" no encontrado`);
    return this.mapToEntity(inv);
  }

  /**
   * Al actualizar stock_actual o stock_minimo el trigger de PostgreSQL
   * recalcula `disponibilidad` y actualiza `actualizado_en` automáticamente.
   */
  async update(id: number, input: UpdateInventarioInput): Promise<InventarioMedicamento> {
    await this.findOne(id);
    const updated = await this.prisma.inventario_medicamentos.update({
      where: { id },
      data: {
        ...(input.stockActual !== undefined && { stock_actual: input.stockActual }),
        ...(input.stockMinimo !== undefined && { stock_minimo: input.stockMinimo }),
        ...(input.precio !== undefined && {
          precio: input.precio ?? null,
        }),
      },
    });
    return this.mapToEntity(updated);
  }

  async remove(id: number): Promise<InventarioMedicamento> {
    const inv = await this.findOne(id);
    await this.prisma.inventario_medicamentos.delete({ where: { id } });
    return inv;
  }

  private mapToEntity(r: {
    id: number;
    medicamento_id: number;
    sede_id: number;
    stock_actual: number;
    stock_minimo: number;
    disponibilidad: string;
    precio: { toString(): string } | null;
    actualizado_en: Date;
  }): InventarioMedicamento {
    return {
      id: r.id,
      medicamentoId: r.medicamento_id,
      sedeId: r.sede_id,
      stockActual: r.stock_actual,
      stockMinimo: r.stock_minimo,
      disponibilidad: r.disponibilidad as DisponibilidadMedicamento,
      precio: r.precio?.toString() ?? undefined,
      actualizadoEn: r.actualizado_en,
    };
  }
}
