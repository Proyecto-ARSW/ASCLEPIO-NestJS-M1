import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { DisponibilidadMedico } from './entities/disponibilidad-medico.entity';
import { CreateDisponibilidadInput } from './dto/create-disponibilidad.input';
import { UpdateDisponibilidadInput } from './dto/update-disponibilidad.input';

@Injectable()
export class DisponibilidadService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDisponibilidadInput): Promise<DisponibilidadMedico> {
    // La FK de la BD valida que el médico exista; solo chequeamos lógica de negocio
    if (input.diaSemana < 0 || input.diaSemana > 6) {
      throw new BadRequestException('diaSemana debe ser un valor entre 0 y 6');
    }

    const horaInicio = new Date(input.horaInicio);
    const horaFin = new Date(input.horaFin);
    if (horaFin <= horaInicio) {
      throw new BadRequestException('horaFin debe ser posterior a horaInicio');
    }
    if (input.duracionCita <= 0) {
      throw new BadRequestException('duracionCita debe ser mayor a 0');
    }

    // Verificar unicidad: mismo médico + mismo día + misma hora de inicio
    const existente = await this.prisma.disponibilidad_medico.findFirst({
      where: {
        medico_id: input.medicoId,
        dia_semana: input.diaSemana,
        hora_inicio: horaInicio,
      },
    });
    if (existente) {
      throw new ConflictException(
        'Ya existe un bloque de disponibilidad para ese médico, día y hora de inicio',
      );
    }

    const registro = await this.prisma.disponibilidad_medico.create({
      data: {
        medico_id: input.medicoId,
        dia_semana: input.diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        duracion_cita: input.duracionCita,
      },
    });

    return this.mapToEntity(registro);
  }

  async findByDoctor(medicoId: string): Promise<DisponibilidadMedico[]> {
    const registros = await this.prisma.disponibilidad_medico.findMany({
      where: { medico_id: medicoId },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
    });
    return registros.map((r) => this.mapToEntity(r));
  }

  async findOne(id: number): Promise<DisponibilidadMedico> {
    const registro = await this.prisma.disponibilidad_medico.findUnique({
      where: { id },
    });
    if (!registro) {
      throw new NotFoundException(`Disponibilidad con ID ${id} no encontrada`);
    }
    return this.mapToEntity(registro);
  }

  async update(input: UpdateDisponibilidadInput): Promise<DisponibilidadMedico> {
    await this.findOne(input.id);

    if (input.horaInicio && input.horaFin) {
      const inicio = new Date(input.horaInicio);
      const fin = new Date(input.horaFin);
      if (fin <= inicio) {
        throw new BadRequestException('horaFin debe ser posterior a horaInicio');
      }
    }
    if (input.duracionCita !== undefined && input.duracionCita <= 0) {
      throw new BadRequestException('duracionCita debe ser mayor a 0');
    }

    const updated = await this.prisma.disponibilidad_medico.update({
      where: { id: input.id },
      data: {
        ...(input.horaInicio !== undefined && {
          hora_inicio: new Date(input.horaInicio),
        }),
        ...(input.horaFin !== undefined && {
          hora_fin: new Date(input.horaFin),
        }),
        ...(input.duracionCita !== undefined && {
          duracion_cita: input.duracionCita,
        }),
        ...(input.activo !== undefined && { activo: input.activo }),
      },
    });

    return this.mapToEntity(updated);
  }

  async remove(id: number): Promise<DisponibilidadMedico> {
    const registro = await this.findOne(id);
    await this.prisma.disponibilidad_medico.delete({ where: { id } });
    return registro;
  }

  /** Desactiva todos los bloques de un médico (útil al desactivar médico) */
  async deactivateAll(medicoId: string): Promise<number> {
    const result = await this.prisma.disponibilidad_medico.updateMany({
      where: { medico_id: medicoId },
      data: { activo: false },
    });
    return result.count;
  }

  private mapToEntity(record: {
    id: number;
    medico_id: string;
    dia_semana: number;
    hora_inicio: Date;
    hora_fin: Date;
    duracion_cita: number;
    activo: boolean;
  }): DisponibilidadMedico {
    return {
      id: record.id,
      medicoId: record.medico_id,
      diaSemana: record.dia_semana,
      horaInicio: record.hora_inicio,
      horaFin: record.hora_fin,
      duracionCita: record.duracion_cita,
      activo: record.activo,
    };
  }
}
