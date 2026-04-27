import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../triage-webhook/guards/api-key.guard';
import { PrismaService } from '../shared/prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';

@Controller('sync')
@UseGuards(ApiKeyGuard)
export class SyncController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  @Get('hospitales')
  getHospitales() {
    return this.prisma.hospitales.findMany({
      select: {
        id: true,
        nombre: true,
        nit: true,
        departamento: true,
        ciudad: true,
        direccion: true,
        telefono: true,
        activo: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  @Get('especialidades')
  getEspecialidades() {
    return this.prisma.especialidades.findMany({
      select: { id: true, nombre: true, descripcion: true },
      orderBy: { nombre: 'asc' },
    });
  }

  @Get('usuarios/:id')
  async getUsuario(@Param('id') id: string) {
    const user = await this.prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: true,
        telefono: true,
        activo: true,
      },
    });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  @Get('pacientes/documento/:cedula')
  async getPacienteByDocumento(@Param('cedula') cedula: string) {
    const hmac = this.enc.hmac(cedula);
    const paciente = await this.prisma.pacientes.findUnique({
      where: { numero_documento_hmac: hmac },
    });
    if (!paciente) {
      throw new NotFoundException(
        `Paciente con documento ${cedula} no encontrado`,
      );
    }
    return this.mapPaciente(paciente);
  }

  @Get('pacientes/:id')
  async getPaciente(@Param('id') id: string) {
    const paciente = await this.prisma.pacientes.findUnique({ where: { id } });
    if (!paciente) throw new NotFoundException(`Paciente ${id} no encontrado`);
    return this.mapPaciente(paciente);
  }

  @Get('enfermeros/:id')
  async getEnfermero(@Param('id') id: string) {
    const enfermero = await this.prisma.enfermeros.findUnique({
      where: { id },
      include: { formacion: { select: { id: true, nombre: true } } },
    });
    if (!enfermero) throw new NotFoundException(`Enfermero ${id} no encontrado`);
    return {
      id: enfermero.id,
      usuario_id: enfermero.usuario_id,
      numero_registro: enfermero.numero_registro,
      nivel_formacion_id: enfermero.nivel_formacion,
      certificacion_triage: enfermero.certificacion_triage,
      activo: enfermero.activo,
      formacion: enfermero.formacion,
    };
  }

  @Get('enfermeros/usuario/:usuarioId')
  async getEnfermeroIdByUsuarioId(@Param('usuarioId') usuarioId: string) {
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

  @Get('medicos/:id')
  async getMedico(@Param('id') id: string) {
    const medico = await this.prisma.medicos.findUnique({ where: { id } });
    if (!medico) throw new NotFoundException(`Médico ${id} no encontrado`);
    return {
      id: medico.id,
      usuario_id: medico.usuario_id,
      especialidad_id: medico.especialidad_id,
      numero_registro: medico.numero_registro,
      consultorio: medico.consultorio,
      activo: medico.activo,
    };
  }

  private mapPaciente(p: {
    id: string;
    usuario_id: string;
    fecha_nacimiento: Date | null;
    tipo_sangre: string | null;
    numero_documento: string | null;
    tipo_documento: string | null;
    eps: string | null;
    alergias: string | null;
  }) {
    return {
      id: p.id,
      usuario_id: p.usuario_id,
      fecha_nacimiento: p.fecha_nacimiento,
      tipo_sangre: this.enc.decryptOrNull(p.tipo_sangre),
      numero_documento: this.enc.decryptOrNull(p.numero_documento),
      tipo_documento: p.tipo_documento,
      eps: p.eps,
      alergias: this.enc.decryptOrNull(p.alergias),
    };
  }
}