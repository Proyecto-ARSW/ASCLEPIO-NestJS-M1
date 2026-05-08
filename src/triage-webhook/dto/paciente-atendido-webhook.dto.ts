import { IsString, IsInt, IsOptional } from 'class-validator';

export class PacienteAtendidoWebhookDto {
  @IsString()
  turno_id: string;

  @IsInt()
  numero_turno: number;

  @IsInt()
  hospital_id: number;

  @IsString()
  paciente_id: string;

  @IsString()
  medico_id: string;

  @IsInt()
  nivel_triage: number;

  @IsInt()
  tiempo_espera_minutos: number;

  @IsInt()
  tiempo_atencion_minutos: number;

  @IsString()
  diagnostico: string;

  @IsString()
  tratamiento: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}