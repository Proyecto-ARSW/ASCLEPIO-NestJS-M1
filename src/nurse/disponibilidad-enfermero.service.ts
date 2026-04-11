import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateDisponibilidadEnfermeroInput } from './dto/create-disponibilidad-enfermero.input';
import { UpdateDisponibilidadEnfermeroInput } from './dto/update-disponibilidad-enfermero.input';
import { DisponibilidadEnfermero } from './entities/disponibilidad-enfermero.entity';

@Injectable()
export class DisponibilidadEnfermeroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateDisponibilidadEnfermeroInput,
  ): Promise<DisponibilidadEnfermero> {
    const horaInicio = new Date(`1970-01-01T${input.horaInicio}:00Z`);
    const horaFin = new Date(`1970-01-01T${input.horaFin}:00Z`);

    try {
      const disp = await this.prisma.disponibilidad_enfermero.create({
        data: {
          enfermero_id: input.enfermeroId,
          dia_semana: input.diaSemana,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
        },
      });
      return this.mapToEntity(disp);
    } catch {
      throw new ConflictException(
        `Ya existe un bloque de disponibilidad para el enfermero en ese día y hora de inicio`,
      );
    }
  }

  async findByNurse(enfermeroId: string): Promise<DisponibilidadEnfermero[]> {
    const disps = await this.prisma.disponibilidad_enfermero.findMany({
      where: { enfermero_id: enfermeroId },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
    });
    return disps.map((d) => this.mapToEntity(d));
  }

  async findOne(id: number): Promise<DisponibilidadEnfermero> {
    const disp = await this.prisma.disponibilidad_enfermero.findUnique({
      where: { id },
    });
    if (!disp)
      throw new NotFoundException(
        `Disponibilidad con ID "${id}" no encontrada`,
      );
    return this.mapToEntity(disp);
  }

  async update(
    input: UpdateDisponibilidadEnfermeroInput,
  ): Promise<DisponibilidadEnfermero> {
    await this.findOne(input.id);
    const data: Record<string, unknown> = {};
    if (input.diaSemana !== undefined) data.dia_semana = input.diaSemana;
    if (input.horaInicio)
      data.hora_inicio = new Date(`1970-01-01T${input.horaInicio}:00Z`);
    if (input.horaFin)
      data.hora_fin = new Date(`1970-01-01T${input.horaFin}:00Z`);

    const updated = await this.prisma.disponibilidad_enfermero.update({
      where: { id: input.id },
      data,
    });
    return this.mapToEntity(updated);
  }

  async remove(id: number): Promise<DisponibilidadEnfermero> {
    const disp = await this.findOne(id);
    await this.prisma.disponibilidad_enfermero.delete({ where: { id } });
    return disp;
  }

  async deactivateAll(enfermeroId: string): Promise<number> {
    const result = await this.prisma.disponibilidad_enfermero.updateMany({
      where: { enfermero_id: enfermeroId },
      data: { activo: false },
    });
    return result.count;
  }

  private mapToEntity(r: {
    id: number;
    enfermero_id: string;
    dia_semana: number;
    hora_inicio: Date;
    hora_fin: Date;
    activo: boolean;
  }): DisponibilidadEnfermero {
    const toTimeStr = (d: Date) => d.toISOString().substring(11, 19); // "HH:MM:SS"
    return {
      id: r.id,
      enfermeroId: r.enfermero_id,
      diaSemana: r.dia_semana,
      horaInicio: toTimeStr(r.hora_inicio),
      horaFin: toTimeStr(r.hora_fin),
      activo: r.activo,
    };
  }
}
