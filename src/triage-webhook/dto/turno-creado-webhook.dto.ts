import { IsString, IsInt } from 'class-validator';

export class TurnoCreadoWebhookDto {
  @IsString()
  turno_id: string;

  @IsInt()
  numero_turno: number;

  @IsInt()
  hospital_id: number;

  @IsString()
  paciente_id: string;

  @IsString()
  tipo_turno: string;

  @IsString()
  estado: string;

  @IsString()
  fecha: string;
}