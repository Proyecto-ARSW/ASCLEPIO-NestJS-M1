export class PacienteAtendidoWebhookDto {
  turno_id: string;
  numero_turno: number;
  hospital_id: number;
  paciente_id: string;
  medico_id: string;
  nivel_triage: number;
  tiempo_espera_minutos: number;
  tiempo_atencion_minutos: number;
  diagnostico: string;
  tratamiento: string;
  observaciones?: string;
}