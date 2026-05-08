import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateCategoriaInput } from './dto/create-categoria.input';
import { UpdateCategoriaInput } from './dto/update-categoria.input';
import { CategoriaMedicamento } from './entities/categoria-medicamento.entity';

interface CacheManager {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<T>;
  del(key: string): Promise<boolean>;
}

const CACHE_KEY = 'categorias:all';
const CACHE_TTL = 600_000; // 10 minutos

@Injectable()
export class CategoriaMedicamentoService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: CacheManager,
  ) {}

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
    await this.cache.del(CACHE_KEY);
    return { id: cat.id, nombre: cat.nombre };
  }

  async findAll(): Promise<CategoriaMedicamento[]> {
    const cached = await this.cache.get<CategoriaMedicamento[]>(CACHE_KEY);
    if (cached) return cached;

    const cats = await this.prisma.categorias_medicamento.findMany({
      orderBy: { nombre: 'asc' },
    });
    const result = cats.map((c) => ({ id: c.id, nombre: c.nombre }));
    await this.cache.set(CACHE_KEY, result, CACHE_TTL);
    return result;
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
    await this.cache.del(CACHE_KEY);
    return { id: updated.id, nombre: updated.nombre };
  }

  async remove(id: number): Promise<CategoriaMedicamento> {
    const cat = await this.findOne(id);
    await this.prisma.categorias_medicamento.delete({ where: { id } });
    await this.cache.del(CACHE_KEY);
    return cat;
  }
}
