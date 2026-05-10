import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { SyncIdResponseDto } from './dto/sync-id-response.dto';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async getMedicoIdByUsuarioId(usuarioId: string): Promise<SyncIdResponseDto> {
    const medico = await this.prisma.medicos.findFirst({
      where: { usuario_id: usuarioId },
      select: { id: true },
    });
    if (!medico) {
      throw new NotFoundException(
        `No existe médico asociado al usuario ${usuarioId}`,
      );
    }
    return { id: medico.id };
  }

  async getEnfermeroIdByUsuarioId(usuarioId: string): Promise<SyncIdResponseDto> {
    const enfermero = await this.prisma.enfermeros.findFirst({
      where: { usuario_id: usuarioId },
      select: { id: true },
    });
    if (!enfermero) {
      throw new NotFoundException(
        `No existe enfermero asociado al usuario ${usuarioId}`,
      );
    }
    return { id: enfermero.id };
  }
}