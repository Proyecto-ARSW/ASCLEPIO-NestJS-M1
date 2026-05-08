import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;
import { PrismaService } from '../shared/prisma/prisma.service';
import { EncryptionService } from '../shared/encryption/encryption.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { RolUsuario } from './enums/rol-usuario.enum';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    // EncryptionService es global (@Global en EncryptionModule) — no necesita
    // ser declarado en UsersModule; NestJS lo resuelve automáticamente.
    private readonly enc: EncryptionService,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const rol = input.rol ?? RolUsuario.PACIENTE;

    if (rol === RolUsuario.MEDICO && !input.medicoData) {
      throw new BadRequestException(
        'Se requieren los datos del médico (medicoData) para crear un usuario con rol MEDICO',
      );
    }
    if (rol === RolUsuario.ENFERMERO && !input.enfermeroData) {
      throw new BadRequestException(
        'Se requieren los datos del enfermero (enfermeroData) para crear un usuario con rol ENFERMERO',
      );
    }
    if (
      rol === RolUsuario.ENFERMERO &&
      input.enfermeroData &&
      !input.enfermeroData.areaEspecializacion
    ) {
      throw new BadRequestException(
        'areaEspecializacion es requerida para el rol ENFERMERO (restricción de base de datos)',
      );
    }

    const existingEmail = await this.prisma.usuarios.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new ConflictException(
        `Ya existe un usuario con el email "${input.email}"`,
      );
    }

    if (rol === RolUsuario.MEDICO && input.medicoData) {
      const existingRegistro = await this.prisma.medicos.findUnique({
        where: { numero_registro: input.medicoData.numeroRegistro },
      });
      if (existingRegistro) {
        throw new ConflictException(
          `Ya existe un médico con el número de registro "${input.medicoData.numeroRegistro}"`,
        );
      }

      const usuario = await this.prisma.$transaction(async (tx) => {
        const nuevoUsuario = await tx.usuarios.create({
          data: {
            nombre: input.nombre,
            apellido: input.apellido,
            email: input.email,
            password_hash: await this.hashPassword(input.password),
            rol: RolUsuario.MEDICO,
            telefono: input.telefono,
          },
        });

        await tx.medicos.create({
          data: {
            usuario_id: nuevoUsuario.id,
            especialidad_id: input.medicoData!.especialidadId,
            numero_registro: input.medicoData!.numeroRegistro,
            consultorio: input.medicoData!.consultorio,
          },
        });

        if (input.hospitalId) {
          await tx.hospital_usuario.create({
            data: {
              hospital_id: input.hospitalId,
              usuario_id: nuevoUsuario.id,
              rol_en_hospital: RolUsuario.MEDICO,
            },
          });
        }

        return nuevoUsuario;
      });

      return this.mapToEntity(usuario);
    }

    if (rol === RolUsuario.ENFERMERO && input.enfermeroData) {
      const existingRegistro = await this.prisma.enfermeros.findUnique({
        where: { numero_registro: input.enfermeroData.numeroRegistro },
      });
      if (existingRegistro) {
        throw new ConflictException(
          `Ya existe un enfermero con el número de registro "${input.enfermeroData.numeroRegistro}"`,
        );
      }

      const usuario = await this.prisma.$transaction(async (tx) => {
        const nuevoUsuario = await tx.usuarios.create({
          data: {
            nombre: input.nombre,
            apellido: input.apellido,
            email: input.email,
            password_hash: await this.hashPassword(input.password),
            rol: RolUsuario.ENFERMERO,
            telefono: input.telefono,
          },
        });

        await tx.enfermeros.create({
          data: {
            usuario_id: nuevoUsuario.id,
            numero_registro: input.enfermeroData!.numeroRegistro,
            nivel_formacion: input.enfermeroData!.nivelFormacion,
            area_especializacion: input.enfermeroData!.areaEspecializacion!,
            certificacion_triage:
              input.enfermeroData!.certificacionTriage ?? false,
            fecha_certificacion: input.enfermeroData!.fechaCertificacion,
          },
        });

        if (input.hospitalId) {
          await tx.hospital_usuario.create({
            data: {
              hospital_id: input.hospitalId,
              usuario_id: nuevoUsuario.id,
              rol_en_hospital: RolUsuario.ENFERMERO,
            },
          });
        }

        return nuevoUsuario;
      });

      return this.mapToEntity(usuario);
    }

    if (rol === RolUsuario.PACIENTE) {
      const usuario = await this.prisma.$transaction(async (tx) => {
        const nuevoUsuario = await tx.usuarios.create({
          data: {
            nombre: input.nombre,
            apellido: input.apellido,
            email: input.email,
            password_hash: await this.hashPassword(input.password),
            rol: RolUsuario.PACIENTE,
            telefono: input.telefono,
          },
        });

        await tx.pacientes.create({
          data: {
            usuario_id: nuevoUsuario.id,
            fecha_nacimiento: input.pacienteData?.fechaNacimiento,
            // Cifrar campos PHI antes de escribir — la BD nunca ve el dato en plaintext
            tipo_sangre: this.enc.encryptOrNull(input.pacienteData?.tipoSangre),
            numero_documento: this.enc.encryptOrNull(
              input.pacienteData?.numeroDocumento,
            ),
            // HMAC determinístico para poder buscar por documento sin descifrarlo
            numero_documento_hmac: this.enc.hmacOrNull(
              input.pacienteData?.numeroDocumento,
            ),
            tipo_documento: input.pacienteData?.tipoDocumento ?? 'CC',
            eps: input.pacienteData?.eps,
            alergias: this.enc.encryptOrNull(input.pacienteData?.alergias),
          },
        });

        if (input.hospitalId) {
          await tx.hospital_usuario.create({
            data: {
              hospital_id: input.hospitalId,
              usuario_id: nuevoUsuario.id,
              rol_en_hospital: RolUsuario.PACIENTE,
            },
          });
        }

        return nuevoUsuario;
      });

      return this.mapToEntity(usuario);
    }

    // ADMIN / RECEPCIONISTA — solo usuario base sin tabla propia
    const usuario = await this.prisma.$transaction(async (tx) => {
      const nuevoUsuario = await tx.usuarios.create({
        data: {
          nombre: input.nombre,
          apellido: input.apellido,
          email: input.email,
          password_hash: await this.hashPassword(input.password),
          rol,
          telefono: input.telefono,
        },
      });

      if (input.hospitalId) {
        await tx.hospital_usuario.create({
          data: {
            hospital_id: input.hospitalId,
            usuario_id: nuevoUsuario.id,
            rol_en_hospital: rol,
          },
        });
      }

      return nuevoUsuario;
    });

    return this.mapToEntity(usuario);
  }

  async findAll(): Promise<User[]> {
    const usuarios = await this.prisma.usuarios.findMany({
      where: { activo: true },
      orderBy: { creado_en: 'desc' },
    });
    return usuarios.map((u) => this.mapToEntity(u));
  }

  async findAllAdmin(): Promise<User[]> {
    const usuarios = await this.prisma.usuarios.findMany({
      orderBy: [{ activo: 'desc' }, { creado_en: 'desc' }],
    });
    return usuarios.map((u) => this.mapToEntity(u));
  }

  async findOne(id: string): Promise<User> {
    const usuario = await this.prisma.usuarios.findUnique({ where: { id } });
    if (!usuario || !usuario.activo) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }
    return this.mapToEntity(usuario);
  }

  private async findOneAdmin(id: string) {
    const usuario = await this.prisma.usuarios.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }
    return usuario;
  }

  async findByEmail(email: string) {
    return this.prisma.usuarios.findUnique({ where: { email } });
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const current = await this.findOneAdmin(id);
    const rolCambia = !!(input.rol && input.rol !== current.rol);

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Borrar perfil del rol anterior cuando el rol cambia
      if (rolCambia) {
        if (current.rol === RolUsuario.MEDICO)
          await tx.medicos.deleteMany({ where: { usuario_id: id } });
        if (current.rol === RolUsuario.ENFERMERO)
          await tx.enfermeros.deleteMany({ where: { usuario_id: id } });
        if (current.rol === RolUsuario.PACIENTE)
          await tx.pacientes.deleteMany({ where: { usuario_id: id } });
      }

      // 2. Actualizar campos base del usuario
      const usuario = await tx.usuarios.update({
        where: { id },
        data: {
          ...(input.nombre && { nombre: input.nombre }),
          ...(input.apellido && { apellido: input.apellido }),
          ...(input.telefono !== undefined && { telefono: input.telefono }),
          ...(input.rol && { rol: input.rol }),
        },
      });

      // 3a. Crear perfil nuevo cuando el rol cambió y el input trae datos
      if (rolCambia) {
        const newRol = input.rol!;
        if (newRol === RolUsuario.MEDICO && input.medicoData) {
          await tx.medicos.create({
            data: {
              usuario_id: id,
              especialidad_id: input.medicoData.especialidadId,
              numero_registro: input.medicoData.numeroRegistro,
              consultorio: input.medicoData.consultorio,
            },
          });
        }
        if (newRol === RolUsuario.ENFERMERO && input.enfermeroData) {
          await tx.enfermeros.create({
            data: {
              usuario_id: id,
              numero_registro: input.enfermeroData.numeroRegistro,
              nivel_formacion: input.enfermeroData.nivelFormacion!,
              area_especializacion: input.enfermeroData.areaEspecializacion!,
              certificacion_triage: input.enfermeroData.certificacionTriage ?? false,
              fecha_certificacion: input.enfermeroData.fechaCertificacion,
            },
          });
        }
        if (newRol === RolUsuario.PACIENTE && input.pacienteData) {
          await tx.pacientes.create({
            data: {
              usuario_id: id,
              fecha_nacimiento: input.pacienteData.fechaNacimiento,
              tipo_sangre: this.enc.encryptOrNull(input.pacienteData.tipoSangre),
              numero_documento: this.enc.encryptOrNull(
                input.pacienteData.numeroDocumento,
              ),
              numero_documento_hmac: this.enc.hmacOrNull(
                input.pacienteData.numeroDocumento,
              ),
              tipo_documento: input.pacienteData.tipoDocumento ?? 'CC',
              eps: input.pacienteData.eps,
              alergias: this.enc.encryptOrNull(input.pacienteData.alergias),
            },
          });
        }
      }

      // 3b. Actualizar perfil existente cuando el rol NO cambió
      if (!rolCambia) {
        if (input.medicoData) {
          await tx.medicos.updateMany({
            where: { usuario_id: id },
            data: {
              especialidad_id: input.medicoData.especialidadId,
              numero_registro: input.medicoData.numeroRegistro,
              ...(input.medicoData.consultorio !== undefined && {
                consultorio: input.medicoData.consultorio,
              }),
            },
          });
        }
        if (input.enfermeroData) {
          await tx.enfermeros.updateMany({
            where: { usuario_id: id },
            data: {
              numero_registro: input.enfermeroData.numeroRegistro,
              nivel_formacion: input.enfermeroData.nivelFormacion!,
              ...(input.enfermeroData.areaEspecializacion && {
                area_especializacion: input.enfermeroData.areaEspecializacion,
              }),
              ...(input.enfermeroData.certificacionTriage !== undefined && {
                certificacion_triage: input.enfermeroData.certificacionTriage,
              }),
            },
          });
        }
      }

      return usuario;
    });

    return this.mapToEntity(updated);
  }

  async activate(id: string): Promise<User> {
    const usuario = await this.findOneAdmin(id);
    if (usuario.activo) {
      throw new BadRequestException(`El usuario con ID "${id}" ya está activo`);
    }
    const activated = await this.prisma.usuarios.update({
      where: { id },
      data: { activo: true },
    });
    return this.mapToEntity(activated);
  }

  async remove(id: string): Promise<User> {
    await this.findOneAdmin(id);
    const deactivated = await this.prisma.usuarios.update({
      where: { id },
      data: { activo: false },
    });
    return this.mapToEntity(deactivated);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = (await scryptAsync(password, salt, 64)).toString('hex');
    return `${salt}:${hash}`;
  }

  private mapToEntity(record: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string | null;
    rol: string;
    activo: boolean;
    creado_en: Date;
  }): User {
    return {
      id: record.id,
      nombre: record.nombre,
      apellido: record.apellido,
      email: record.email,
      telefono: record.telefono ?? undefined,
      rol: record.rol as RolUsuario,
      activo: record.activo,
      creadoEn: record.creado_en,
    };
  }
}
// Daniel Useche
