export class SyncMedicoDto {
  id: string;
  usuario_id: string;
  especialidad_id: number | null;
  numero_registro: string;
  consultorio: string | null;
  activo: boolean;
}