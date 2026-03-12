import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';

export const ROLES_KEY = 'roles';

/**
 * Especifica los roles que pueden acceder a un endpoint.
 * @example @Roles(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
 */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
