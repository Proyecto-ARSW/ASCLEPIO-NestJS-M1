import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { RolUsuario } from './enums/rol-usuario.enum';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput): Promise<User> {
    if (input.rol === RolUsuario.MEDICO && !input.medicoData) {
      throw new BadRequestException(
        'Se requieren los datos del médico (medicoData) para crear un usuario con rol MEDICO',
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

    if (input.rol === RolUsuario.MEDICO && input.medicoData) {
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
            password_hash: this.hashPassword(input.password),
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

        return nuevoUsuario;
      });

      return this.mapToEntity(usuario);
    }

    const rol = input.rol ?? RolUsuario.PACIENTE;

    if (rol === RolUsuario.PACIENTE) {
      const usuario = await this.prisma.$transaction(async (tx) => {
        const nuevoUsuario = await tx.usuarios.create({
          data: {
            nombre: input.nombre,
            apellido: input.apellido,
            email: input.email,
            password_hash: this.hashPassword(input.password),
            rol: RolUsuario.PACIENTE,
            telefono: input.telefono,
          },
        });

        await tx.pacientes.create({
          data: {
            usuario_id: nuevoUsuario.id,
            fecha_nacimiento: input.pacienteData?.fechaNacimiento,
            tipo_sangre: input.pacienteData?.tipoSangre,
            numero_documento: input.pacienteData?.numeroDocumento,
            tipo_documento: input.pacienteData?.tipoDocumento ?? 'CC',
            eps: input.pacienteData?.eps,
            alergias: input.pacienteData?.alergias,
            antecedentes: input.pacienteData?.antecedentes,
          },
        });

        return nuevoUsuario;
      });

      return this.mapToEntity(usuario);
    }

    const usuario = await this.prisma.usuarios.create({
      data: {
        nombre: input.nombre,
        apellido: input.apellido,
        email: input.email,
        password_hash: this.hashPassword(input.password),
        rol,
        telefono: input.telefono,
      },
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

  async findOne(id: string): Promise<User> {
    const usuario = await this.prisma.usuarios.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }

    return this.mapToEntity(usuario);
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    await this.findOne(id);

    const updated = await this.prisma.usuarios.update({
      where: { id },
      data: {
        ...(input.nombre && { nombre: input.nombre }),
        ...(input.apellido && { apellido: input.apellido }),
        ...(input.telefono !== undefined && { telefono: input.telefono }),
        ...(input.rol && { rol: input.rol }),
      },
    });

    return this.mapToEntity(updated);
  }

  async remove(id: string): Promise<User> {
    await this.findOne(id);

    const deactivated = await this.prisma.usuarios.update({
      where: { id },
      data: { activo: false },
    });

    return this.mapToEntity(deactivated);
  }

  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
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
