import { IsString, IsInt } from 'class-validator';

export class TurnoCanceladoWebhookDto {
  @IsString()
  turno_id: string;

  @IsInt()
  hospital_id: number;

  @IsString()
  paciente_id: string;

  @IsInt()
  numero_turno: number;

  @IsString()
  razon: string;
}