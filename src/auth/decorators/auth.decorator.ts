import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';

/**
 * @Auth() — Requiere únicamente que el usuario esté autenticado (cualquier rol).
 * @Auth(RolUsuario.ADMIN) — Requiere autenticación + rol específico.
 */
export const Auth = (...roles: RolUsuario[]) =>
  applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    ...(roles.length > 0 ? [Roles(...roles)] : []),
  );
