import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateSedeInput } from './dto/create-sede.input';
import { UpdateSedeInput } from './dto/update-sede.input';
import { Sede } from './entities/sede.entity';

interface CacheManager {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<T>;
  del(key: string): Promise<boolean>;
}

const CACHE_KEY = 'sedes:all';
const CACHE_TTL = 600_000; // 10 minutos

@Injectable()
export class SedesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: CacheManager,
  ) {}

  async create(input: CreateSedeInput): Promise<Sede> {
    const sede = await this.prisma.sedes.create({
      data: {
        nombre: input.nombre,
        direccion: input.direccion,
        ciudad: input.ciudad,
      },
    });
    await this.cache.del(CACHE_KEY);
    return this.mapToEntity(sede);
  }

  async findAll(): Promise<Sede[]> {
    const cached = await this.cache.get<Sede[]>(CACHE_KEY);
    if (cached) return cached;

    const sedes = await this.prisma.sedes.findMany({
      orderBy: { nombre: 'asc' },
    });
    const result = sedes.map((s) => this.mapToEntity(s));
    await this.cache.set(CACHE_KEY, result, CACHE_TTL);
    return result;
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
    await this.cache.del(CACHE_KEY);
    return this.mapToEntity(updated);
  }

  async remove(id: number): Promise<Sede> {
    const sede = await this.findOne(id);
    await this.prisma.sedes.delete({ where: { id } });
    await this.cache.del(CACHE_KEY);
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
