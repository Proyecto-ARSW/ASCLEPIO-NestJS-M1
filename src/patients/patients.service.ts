import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { CreatePatientInput } from './dto/create-patient.input';
import { UpdatePatientInput } from './dto/update-patient.input';
import { Patient } from './entities/patient.entity';

const includeUsuario = { usuarios: true } as const;

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    // EncryptionService es global (@Global en EncryptionModule) — no necesita
    // ser declarado en PatientsModule; NestJS lo resuelve automáticamente.
    private readonly enc: EncryptionService,
  ) {}

  async create(input: CreatePatientInput): Promise<Patient> {
    if (input.numeroDocumento) {
      // Búsqueda por HMAC determinístico: mismo plaintext → mismo hash,
      // aunque el ciphertext AES-GCM sea diferente cada vez (IV aleatorio).
      const hmac = this.enc.hmac(input.numeroDocumento);
      const existing = await this.prisma.pacientes.findUnique({
        where: { numero_documento_hmac: hmac },
      });

      if (existing) {
        throw new ConflictException(
          `Ya existe un paciente con el número de documento "${input.numeroDocumento}"`,
        );
      }
    }

    const patient = await this.prisma.pacientes.create({
      data: {
        usuario_id: input.usuarioId,
        fecha_nacimiento: input.fechaNacimiento,
        // Ciframos antes de escribir — la BD nunca ve el dato en plaintext
        tipo_sangre: this.enc.encryptOrNull(input.tipoSangre),
        numero_documento: this.enc.encryptOrNull(input.numeroDocumento),
        numero_documento_hmac: this.enc.hmacOrNull(input.numeroDocumento),
        tipo_documento: input.tipoDocumento ?? 'CC',
        eps: input.eps,
        // alergias es PHI crítico: un médico de urgencias necesita saberlas
        alergias: this.enc.encryptOrNull(input.alergias),
      },
      include: includeUsuario,
    });

    return this.mapToEntity(patient);
  }

  async findAll(): Promise<Patient[]> {
    const patients = await this.prisma.pacientes.findMany({
      orderBy: { creado_en: 'desc' },
      include: includeUsuario,
    });

    // mapToEntity descifra los campos PHI antes de devolver al resolver
    return patients.map((p) => this.mapToEntity(p));
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.prisma.pacientes.findUnique({
      where: { id },
      include: includeUsuario,
    });

    if (!patient) {
      throw new NotFoundException(`Paciente con ID "${id}" no encontrado`);
    }

    return this.mapToEntity(patient);
  }

  async update(id: string, input: UpdatePatientInput): Promise<Patient> {
    await this.findOne(id);

    if (input.numeroDocumento) {
      // Igual que en create: buscar por HMAC para detectar duplicado
      const hmac = this.enc.hmac(input.numeroDocumento);
      const conflict = await this.prisma.pacientes.findFirst({
        where: {
          numero_documento_hmac: hmac,
          NOT: { id },
        },
      });

      if (conflict) {
        throw new ConflictException(
          `El número de documento "${input.numeroDocumento}" ya está en uso por otro paciente`,
        );
      }
    }

    const updated = await this.prisma.pacientes.update({
      where: { id },
      data: {
        ...(input.usuarioId && { usuario_id: input.usuarioId }),
        ...(input.fechaNacimiento !== undefined && {
          fecha_nacimiento: input.fechaNacimiento,
        }),
        ...(input.tipoSangre !== undefined && {
          tipo_sangre: this.enc.encryptOrNull(input.tipoSangre),
        }),
        ...(input.numeroDocumento !== undefined && {
          numero_documento: this.enc.encryptOrNull(input.numeroDocumento),
          // Siempre actualizar el HMAC junto con el ciphertext
          numero_documento_hmac: this.enc.hmacOrNull(input.numeroDocumento),
        }),
        ...(input.tipoDocumento !== undefined && {
          tipo_documento: input.tipoDocumento,
        }),
        ...(input.eps !== undefined && { eps: input.eps }),
        ...(input.alergias !== undefined && {
          alergias: this.enc.encryptOrNull(input.alergias),
        }),
      },
      include: includeUsuario,
    });

    return this.mapToEntity(updated);
  }

  async remove(id: string): Promise<Patient> {
    await this.findOne(id);

    const deleted = await this.prisma.pacientes.delete({
      where: { id },
      include: includeUsuario,
    });

    return this.mapToEntity(deleted);
  }

  private mapToEntity(record: {
    id: string;
    usuario_id: string;
    fecha_nacimiento: Date | null;
    tipo_sangre: string | null;
    numero_documento: string | null;
    tipo_documento: string | null;
    eps: string | null;
    alergias: string | null;
    creado_en: Date;
    usuarios: {
      nombre: string;
      apellido: string;
      email: string;
      telefono: string | null;
    };
  }): Patient {
    return {
      id: record.id,
      usuarioId: record.usuario_id,
      nombre: record.usuarios.nombre,
      apellido: record.usuarios.apellido,
      email: record.usuarios.email,
      telefono: record.usuarios.telefono ?? undefined,
      fechaNacimiento: record.fecha_nacimiento ?? undefined,
      // Desciframos al leer — el resolver y el cliente reciben el plaintext
      tipoSangre: this.enc.decryptOrNull(record.tipo_sangre) ?? undefined,
      numeroDocumento: this.enc.decryptOrNull(record.numero_documento) ?? undefined,
      tipoDocumento: record.tipo_documento ?? undefined,
      eps: record.eps ?? undefined,
      alergias: this.enc.decryptOrNull(record.alergias) ?? undefined,
      creadoEn: record.creado_en,
    };
  }
}

// Daniel Useche
