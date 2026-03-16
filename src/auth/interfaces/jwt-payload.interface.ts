import { RolUsuario } from 'src/users/enums/rol-usuario.enum';

/**
 * Clase del payload JWT. Definida como clase (no interface) para
 * compatibilidad con emitDecoratorMetadata en parámetros decorados.
 */
export class JwtPayload {
  /** usuario.id (UUID) */
  sub: string;
  email: string;
  rol: RolUsuario;
  nombre: string;
  apellido: string;
  /** Hospital seleccionado en sesión. Undefined en el preToken post-login. */
  hospitalId?: number;
  hospitalNombre?: string;
}
