import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateCategoriaInput } from './dto/create-categoria.input';
import { UpdateCategoriaInput } from './dto/update-categoria.input';
import { CategoriaMedicamento } from './entities/categoria-medicamento.entity';

@Injectable()
export class CategoriaMedicamentoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCategoriaInput): Promise<CategoriaMedicamento> {
    const existing = await this.prisma.categorias_medicamento.findUnique({
      where: { nombre: input.nombre },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una categoría con el nombre "${input.nombre}"`,
      );
    }
    const cat = await this.prisma.categorias_medicamento.create({
      data: { nombre: input.nombre },
    });
    return { id: cat.id, nombre: cat.nombre };
  }

  async findAll(): Promise<CategoriaMedicamento[]> {
    const cats = await this.prisma.categorias_medicamento.findMany({
      orderBy: { nombre: 'asc' },
    });
    return cats.map((c) => ({ id: c.id, nombre: c.nombre }));
  }

  async findOne(id: number): Promise<CategoriaMedicamento> {
    const cat = await this.prisma.categorias_medicamento.findUnique({
      where: { id },
    });
    if (!cat)
      throw new NotFoundException(`Categoría con ID "${id}" no encontrada`);
    return { id: cat.id, nombre: cat.nombre };
  }

  async update(
    id: number,
    input: UpdateCategoriaInput,
  ): Promise<CategoriaMedicamento> {
    await this.findOne(id);
    if (input.nombre) {
      const conflict = await this.prisma.categorias_medicamento.findFirst({
        where: { nombre: input.nombre, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `El nombre "${input.nombre}" ya está en uso por otra categoría`,
        );
      }
    }
    const updated = await this.prisma.categorias_medicamento.update({
      where: { id },
      data: { ...(input.nombre && { nombre: input.nombre }) },
    });
    return { id: updated.id, nombre: updated.nombre };
  }

  async remove(id: number): Promise<CategoriaMedicamento> {
    const cat = await this.findOne(id);
    await this.prisma.categorias_medicamento.delete({ where: { id } });
    return cat;
  }
}
