import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Controller('webhooks/triage')
@UseGuards(ApiKeyGuard)
export class TriageWebhookController {
  private readonly logger = new Logger(TriageWebhookController.name);

  constructor(private readonly rabbitmq: RabbitmqService) {}

  @Post('turno-creado')
  async handleTurnoCreado(
    @Body()
    payload: {
      turno_id: string;
      numero_turno: number;
      hospital_id: number;
      paciente_id: string;
      tipo_turno: string;
      estado: string;
      fecha: string;
    },
  ) {
    this.logger.log(
      `Webhook: turno-creado — Turno #${payload.numero_turno}, Paciente: ${payload.paciente_id}`,
    );
    this.rabbitmq.notifyTriageTurnoCreado(payload);
    return { received: true, event: 'turno-creado', turno_id: payload.turno_id };
  }

  @Post('turno-cancelado')
  async handleTurnoCancelado(
    @Body()
    payload: {
      turno_id: string;
      hospital_id: number;
      paciente_id: string;
      numero_turno: number;
      razon: string;
    },
  ) {
    this.logger.log(
      `Webhook: turno-cancelado — Turno #${payload.numero_turno}, Razón: ${payload.razon}`,
    );
    this.rabbitmq.notifyTriageTurnoCancelado(payload);
    return { received: true, event: 'turno-cancelado', turno_id: payload.turno_id };
  }

  @Post('paciente-atendido')
  async handlePacienteAtendido(
    @Body()
    payload: {
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
    },
  ) {
    this.logger.log(
      `Webhook: paciente-atendido — Turno #${payload.numero_turno}, Dx: ${payload.diagnostico}`,
    );
    this.rabbitmq.notifyTriagePacienteAtendido(payload);
    return { received: true, event: 'paciente-atendido', turno_id: payload.turno_id };
  }
}