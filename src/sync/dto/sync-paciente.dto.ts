export class SyncPacienteDto {
  id: string;
  usuario_id: string;
  fecha_nacimiento: Date | null;
  tipo_sangre: string | null;
  numero_documento: string | null;
  tipo_documento: string | null;
  eps: string | null;
  alergias: string | null;
}