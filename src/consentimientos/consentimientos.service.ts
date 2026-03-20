import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateConsentimientoInput } from './dto/create-consentimiento.input';
import { UpdateConsentimientoInput } from './dto/update-consentimiento.input';
import { ConsentimientoPaciente } from './entities/consentimiento-paciente.entity';

@Injectable()
export class ConsentimientosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateConsentimientoInput): Promise<ConsentimientoPaciente> {
    const consent = await this.prisma.consentimientos_paciente.create({
      data: {
        paciente_id: input.pacienteId,
        tipo_consentimiento: input.tipoConsentimiento,
        consentimiento_otorgado: input.consentimientoOtorgado,
        documento_firmado: input.documentoFirmado,
      },
    });
    return this.mapToEntity(consent);
  }

  /** Lista todos los consentimientos de un paciente */
  async findByPaciente(pacienteId: string): Promise<ConsentimientoPaciente[]> {
    const consents = await this.prisma.consentimientos_paciente.findMany({
      where: { paciente_id: pacienteId },
      orderBy: { fecha_consentimiento: 'desc' },
    });
    return consents.map((c) => this.mapToEntity(c));
  }

  async findOne(id: number): Promise<ConsentimientoPaciente> {
    const consent = await this.prisma.consentimientos_paciente.findUnique({ where: { id } });
    if (!consent) throw new NotFoundException(`Consentimiento con ID "${id}" no encontrado`);
    return this.mapToEntity(consent);
  }

  /** Actualiza únicamente el documento firmado */
  async update(id: number, input: UpdateConsentimientoInput): Promise<ConsentimientoPaciente> {
    await this.findOne(id);
    const updated = await this.prisma.consentimientos_paciente.update({
      where: { id },
      data: {
        ...(input.documentoFirmado !== undefined && {
          documento_firmado: input.documentoFirmado,
        }),
      },
    });
    return this.mapToEntity(updated);
  }

  /**
   * Revoca un consentimiento.
   * Un consentimiento ya revocado no puede revocarse nuevamente.
   */
  async revocar(id: number): Promise<ConsentimientoPaciente> {
    const consent = await this.findOne(id);
    if (consent.revocado) {
      throw new BadRequestException(`El consentimiento con ID "${id}" ya fue revocado`);
    }
    const updated = await this.prisma.consentimientos_paciente.update({
      where: { id },
      data: {
        revocado: true,
        fecha_revocacion: new Date(),
      },
    });
    return this.mapToEntity(updated);
  }

  private mapToEntity(r: {
    id: number;
    paciente_id: string;
    tipo_consentimiento: string;
    consentimiento_otorgado: boolean;
    fecha_consentimiento: Date;
    revocado: boolean;
    fecha_revocacion: Date | null;
    documento_firmado: string | null;
  }): ConsentimientoPaciente {
    return {
      id: r.id,
      pacienteId: r.paciente_id,
      tipoConsentimiento: r.tipo_consentimiento,
      consentimientoOtorgado: r.consentimiento_otorgado,
      fechaConsentimiento: r.fecha_consentimiento,
      revocado: r.revocado,
      fechaRevocacion: r.fecha_revocacion ?? undefined,
      documentoFirmado: r.documento_firmado ?? undefined,
    };
  }
}
