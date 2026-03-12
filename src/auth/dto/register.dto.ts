import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';

export class MedicoDataDto {
  @ApiProperty({ example: 1, description: 'ID de la especialidad médica' })
  @IsInt()
  @Min(1)
  especialidadId: number;

  @ApiProperty({ example: 'RM-2024-001', description: 'Número de registro médico único' })
  @IsString()
  @MaxLength(50)
  numeroRegistro: string;

  @ApiPropertyOptional({ example: 'Consultorio 301' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  consultorio?: string;
}

export class PacienteDataDto {
  @ApiPropertyOptional({ example: '1990-05-15', type: String, format: 'date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fechaNacimiento?: Date;

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  tipoSangre?: string;

  @ApiPropertyOptional({ example: '1023456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  numeroDocumento?: string;

  @ApiPropertyOptional({ example: 'CC', default: 'CC' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tipoDocumento?: string;

  @ApiPropertyOptional({ example: 'Sura EPS' })
  @IsOptional()
  @IsString()
  eps?: string;

  @ApiPropertyOptional({ example: 'Penicilina' })
  @IsOptional()
  @IsString()
  alergias?: string;
}

export class EnfermeroDataDto {
  @ApiProperty({ example: 'ENF-2024-001', description: 'Número de registro profesional' })
  @IsString()
  @MaxLength(50)
  numeroRegistro: string;

  @ApiProperty({ example: 1, description: 'ID del nivel de formación (FK formacion)' })
  @IsInt()
  @Min(1)
  nivelFormacion: number;

  @ApiPropertyOptional({ example: 2, description: 'ID del área de especialización (FK especialidades)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  areaEspecializacion?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  certificacionTriage?: boolean;

  @ApiPropertyOptional({ example: '2023-06-01', type: String, format: 'date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fechaCertificacion?: Date;
}

export class RegisterDto {
  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'García', description: 'Apellido del usuario' })
  @IsString()
  apellido: string;

  @ApiProperty({ example: 'juan.garcia@hospital.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    enum: RolUsuario,
    default: RolUsuario.PACIENTE,
    description: 'Rol asignado. Por defecto PACIENTE.',
  })
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @ApiPropertyOptional({
    example: 1,
    description:
      'ID del hospital al que se vincula el usuario. ' +
      'Requerido para todos los roles excepto ADMIN (que puede registrarse sin hospital y crearlo después).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  hospitalId?: number;

  @ApiPropertyOptional({ type: MedicoDataDto, description: 'Requerido si rol = MEDICO' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MedicoDataDto)
  medicoData?: MedicoDataDto;

  @ApiPropertyOptional({ type: PacienteDataDto, description: 'Opcional si rol = PACIENTE' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PacienteDataDto)
  pacienteData?: PacienteDataDto;

  @ApiPropertyOptional({ type: EnfermeroDataDto, description: 'Requerido si rol = ENFERMERO' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnfermeroDataDto)
  enfermeroData?: EnfermeroDataDto;
}
