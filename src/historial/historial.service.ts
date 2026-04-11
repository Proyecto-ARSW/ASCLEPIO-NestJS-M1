import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateHistorialInput } from './dto/create-historial.input';
import { UpdateHistorialInput } from './dto/update-historial.input';
import { HistorialMedico } from './entities/historial-medico.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

@Injectable()
export class HistorialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Solo MEDICO o ADMIN pueden crear registros en el historial.
   */
  async create(input: CreateHistorialInput): Promise<HistorialMedico> {
    const historial = await this.prisma.historial_medico.create({
      data: {
        paciente_id: input.pacienteId,
        medico_id: input.medicoId,
        cita_id: input.citaId,
        diagnostico: input.diagnostico,
        tratamiento: input.tratamiento,
        observaciones: input.observaciones,
      },
    });
    return this.mapToEntity(historial);
  }

  /** Obtiene todo el historial de un paciente ordenado del más reciente al más antiguo. */
  async findByPaciente(pacienteId: string): Promise<HistorialMedico[]> {
    const registros = await this.prisma.historial_medico.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { creado_en: 'desc' },
    });
    return registros.map((r) => this.mapToEntity(r));
  }

  /** Obtiene todos los registros generados por un médico. */
  async findByMedico(medicoId: string): Promise<HistorialMedico[]> {
    const registros = await this.prisma.historial_medico.findMany({
      where: { medico_id: medicoId },
      orderBy: { creado_en: 'desc' },
    });
    return registros.map((r) => this.mapToEntity(r));
  }

  async findOne(id: string): Promise<HistorialMedico> {
    const historial = await this.prisma.historial_medico.findUnique({
      where: { id },
    });
    if (!historial)
      throw new NotFoundException(`Historial con ID "${id}" no encontrado`);
    return this.mapToEntity(historial);
  }

  /**
   * Solo el médico que creó el registro o un ADMIN pueden actualizarlo.
   */
  async update(
    id: string,
    input: UpdateHistorialInput,
    currentUser: JwtPayload,
  ): Promise<HistorialMedico> {
    const historial = await this.findOne(id);

    if (
      currentUser.rol !== RolUsuario.ADMIN &&
      historial.medicoId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'Solo el médico autor o un ADMIN pueden modificar este historial',
      );
    }

    const updated = await this.prisma.historial_medico.update({
      where: { id },
      data: {
        ...(input.diagnostico !== undefined && {
          diagnostico: input.diagnostico,
        }),
        ...(input.tratamiento !== undefined && {
          tratamiento: input.tratamiento,
        }),
        ...(input.observaciones !== undefined && {
          observaciones: input.observaciones,
        }),
      },
    });
    return this.mapToEntity(updated);
  }

  private mapToEntity(r: {
    id: string;
    paciente_id: string;
    cita_id: string | null;
    medico_id: string;
    diagnostico: string | null;
    tratamiento: string | null;
    observaciones: string | null;
    creado_en: Date;
  }): HistorialMedico {
    return {
      id: r.id,
      pacienteId: r.paciente_id,
      citaId: r.cita_id ?? undefined,
      medicoId: r.medico_id,
      diagnostico: r.diagnostico ?? undefined,
      tratamiento: r.tratamiento ?? undefined,
      observaciones: r.observaciones ?? undefined,
      creadoEn: r.creado_en,
    };
  }
}
