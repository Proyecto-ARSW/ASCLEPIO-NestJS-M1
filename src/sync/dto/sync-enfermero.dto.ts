export class SyncFormacionDto {
  id: string;
  nombre: string;
}

export class SyncEnfermeroDto {
  id: string;
  usuario_id: string;
  numero_registro: string;
  nivel_formacion_id: string | null;
  certificacion_triage: boolean;
  activo: boolean;
  formacion: SyncFormacionDto | null;
}