import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';

export class HospitalBasicDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Hospital General de Medellín' })
  nombre: string;

  @ApiProperty({ example: 'Antioquia' })
  departamento: string;

  @ApiProperty({ example: 'Medellín' })
  ciudad: string;
}

export class UsuarioBasicDto {
  @ApiProperty({ example: 'uuid-1234' })
  id: string;

  @ApiProperty({ example: 'Juan' })
  nombre: string;

  @ApiProperty({ example: 'García' })
  apellido: string;

  @ApiProperty({ example: 'juan.garcia@hospital.com' })
  email: string;

  @ApiProperty({ enum: RolUsuario })
  rol: RolUsuario;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Token temporal (5 min) para seleccionar hospital' })
  preToken: string;

  @ApiProperty({ type: UsuarioBasicDto })
  usuario: UsuarioBasicDto;

  @ApiProperty({ type: [HospitalBasicDto], description: 'Hospitales en los que el usuario está registrado' })
  hospitales: HospitalBasicDto[];
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT de acceso completo con hospital en sesión' })
  accessToken: string;

  @ApiProperty({ type: UsuarioBasicDto })
  usuario: UsuarioBasicDto;

  @ApiPropertyOptional({ type: HospitalBasicDto })
  hospital?: HospitalBasicDto;
}
