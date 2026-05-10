export class SyncUsuarioDto {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  telefono: string | null;
  activo: boolean;
}