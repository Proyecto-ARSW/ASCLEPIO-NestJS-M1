import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';
import {
  LoginResponseDto,
  AuthResponseDto,
  HospitalBasicDto,
  UsuarioBasicDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SelectHospitalDto } from './dto/select-hospital.dto';
import { JoinHospitalDto } from './dto/join-hospital.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  // ── REGISTRO ─────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const rol = dto.rol ?? RolUsuario.PACIENTE;

    if (rol === RolUsuario.MEDICO && !dto.medicoData) {
      throw new BadRequestException('medicoData es requerido para el rol MEDICO');
    }
    if (rol === RolUsuario.ENFERMERO && !dto.enfermeroData) {
      throw new BadRequestException('enfermeroData es requerido para el rol ENFERMERO');
    }
    if (
      rol === RolUsuario.ENFERMERO &&
      dto.enfermeroData &&
      !dto.enfermeroData.areaEspecializacion
    ) {
      throw new BadRequestException(
        'areaEspecializacion es requerida para ENFERMERO (restricción de base de datos)',
      );
    }
    if (!dto.hospitalId && rol !== RolUsuario.ADMIN) {
      throw new BadRequestException(
        'hospitalId es requerido para todos los roles excepto ADMIN',
      );
    }

    const emailExiste = await this.prisma.usuarios.findUnique({
      where: { email: dto.email },
    });
    if (emailExiste) {
      throw new ConflictException(`Ya existe un usuario con el email "${dto.email}"`);
    }

    let hospital: { id: number; nombre: string; departamento: string; ciudad: string } | null = null;
    if (dto.hospitalId) {
      hospital = await this.prisma.hospitales.findUnique({
        where: { id: dto.hospitalId },
      });
      if (!hospital) {
        throw new NotFoundException(`Hospital con ID ${dto.hospitalId} no encontrado o inactivo`);
      }
    }

    if (rol === RolUsuario.MEDICO && dto.medicoData) {
      const existe = await this.prisma.medicos.findUnique({
        where: { numero_registro: dto.medicoData.numeroRegistro },
      });
      if (existe) {
        throw new ConflictException(
          `Ya existe un médico con el número de registro "${dto.medicoData.numeroRegistro}"`,
        );
      }
    }

    if (rol === RolUsuario.ENFERMERO && dto.enfermeroData) {
      const existe = await this.prisma.enfermeros.findUnique({
        where: { numero_registro: dto.enfermeroData.numeroRegistro },
      });
      if (existe) {
        throw new ConflictException(
          `Ya existe un enfermero con el número de registro "${dto.enfermeroData.numeroRegistro}"`,
        );
      }
    }

    const usuario = await this.prisma.$transaction(async (tx) => {
      const nuevoUsuario = await tx.usuarios.create({
        data: {
          nombre: dto.nombre,
          apellido: dto.apellido,
          email: dto.email,
          password_hash: this.hashPassword(dto.password),
          rol,
          telefono: dto.telefono,
        },
      });

      if (rol === RolUsuario.PACIENTE) {
        await tx.pacientes.create({
          data: {
            usuario_id: nuevoUsuario.id,
            fecha_nacimiento: dto.pacienteData?.fechaNacimiento,
            tipo_sangre: dto.pacienteData?.tipoSangre,
            numero_documento: dto.pacienteData?.numeroDocumento,
            tipo_documento: dto.pacienteData?.tipoDocumento ?? 'CC',
            eps: dto.pacienteData?.eps,
            alergias: dto.pacienteData?.alergias,
          },
        });
      } else if (rol === RolUsuario.MEDICO && dto.medicoData) {
        await tx.medicos.create({
          data: {
            usuario_id: nuevoUsuario.id,
            especialidad_id: dto.medicoData.especialidadId,
            numero_registro: dto.medicoData.numeroRegistro,
            consultorio: dto.medicoData.consultorio,
          },
        });
      } else if (rol === RolUsuario.ENFERMERO && dto.enfermeroData) {
        await tx.enfermeros.create({
          data: {
            usuario_id: nuevoUsuario.id,
            numero_registro: dto.enfermeroData.numeroRegistro,
            nivel_formacion: dto.enfermeroData.nivelFormacion,
            area_especializacion: dto.enfermeroData.areaEspecializacion!,
            certificacion_triage: dto.enfermeroData.certificacionTriage ?? false,
            fecha_certificacion: dto.enfermeroData.fechaCertificacion,
          },
        });
      }

      if (dto.hospitalId) {
        await tx.hospital_usuario.create({
          data: {
            hospital_id: dto.hospitalId,
            usuario_id: nuevoUsuario.id,
            rol_en_hospital: rol,
          },
        });
      }

      return nuevoUsuario;
    });

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol as RolUsuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      ...(hospital && { hospitalId: hospital.id, hospitalNombre: hospital.nombre }),
    };

    this.rabbitmqService.notifyUserRegistered(
      usuario.email,
      `${usuario.nombre} ${usuario.apellido}`,
    );

    return {
      accessToken: this.jwtService.sign(payload),
      usuario: this.mapUsuario(usuario),
      ...(hospital && { hospital: this.mapHospital(hospital) }),
    };
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { email: dto.email },
      include: {
        hospital_usuario: {
          include: { hospitales: true },
        },
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!this.verifyPassword(dto.password, usuario.password_hash)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const hospitales = usuario.hospital_usuario
      .filter((hu) => hu.hospitales.activo)
      .map((hu) => this.mapHospital(hu.hospitales));

    const prePayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol as RolUsuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
    };

    const preToken = this.jwtService.sign(prePayload, { expiresIn: '5m' });

    return {
      preToken,
      usuario: this.mapUsuario(usuario),
      hospitales,
    };
  }

  // ── SELECCIONAR HOSPITAL ──────────────────────────────────────────────────────

  async selectHospital(
    currentUser: JwtPayload,
    dto: SelectHospitalDto,
  ): Promise<AuthResponseDto> {
    const vinculo = await this.prisma.hospital_usuario.findUnique({
      where: {
        hospital_id_usuario_id: {
          hospital_id: dto.hospitalId,
          usuario_id: currentUser.sub,
        },
      },
      include: { hospitales: true },
    });

    if (!vinculo || !vinculo.hospitales.activo) {
      throw new ForbiddenException(
        `No tienes acceso al hospital con ID ${dto.hospitalId}. Inscríbete primero con POST /auth/join-hospital.`,
      );
    }

    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: currentUser.sub },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol as RolUsuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      hospitalId: vinculo.hospitales.id,
      hospitalNombre: vinculo.hospitales.nombre,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      usuario: this.mapUsuario(usuario),
      hospital: this.mapHospital(vinculo.hospitales),
    };
  }

  // ── INSCRIBIRSE A OTRO HOSPITAL ───────────────────────────────────────────────

  async joinHospital(
    currentUser: JwtPayload,
    dto: JoinHospitalDto,
  ): Promise<{ mensaje: string; hospital: HospitalBasicDto }> {
    const hospital = await this.prisma.hospitales.findUnique({
      where: { id: dto.hospitalId },
    });
    if (!hospital || !hospital.activo) {
      throw new NotFoundException(
        `Hospital con ID ${dto.hospitalId} no encontrado o inactivo`,
      );
    }

    const yaVinculado = await this.prisma.hospital_usuario.findUnique({
      where: {
        hospital_id_usuario_id: {
          hospital_id: dto.hospitalId,
          usuario_id: currentUser.sub,
        },
      },
    });
    if (yaVinculado) {
      throw new ConflictException(
        `Ya estás inscrito en el hospital "${hospital.nombre}"`,
      );
    }

    await this.prisma.hospital_usuario.create({
      data: {
        hospital_id: dto.hospitalId,
        usuario_id: currentUser.sub,
        rol_en_hospital: currentUser.rol,
      },
    });

    return {
      mensaje: `Inscripción exitosa en "${hospital.nombre}". Inicia sesión y selecciona este hospital.`,
      hospital: this.mapHospital(hospital),
    };
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    try {
      const derivedHash = scryptSync(password, salt, 64);
      return timingSafeEqual(Buffer.from(hash, 'hex'), derivedHash);
    } catch {
      return false;
    }
  }

  private mapUsuario(u: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
  }): UsuarioBasicDto {
    return {
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      rol: u.rol as RolUsuario,
    };
  }

  private mapHospital(h: {
    id: number;
    nombre: string;
    departamento: string;
    ciudad: string;
  }): HospitalBasicDto {
    return { id: h.id, nombre: h.nombre, departamento: h.departamento, ciudad: h.ciudad };
  }
}
