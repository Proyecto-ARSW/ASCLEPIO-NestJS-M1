// src/modules/triage-webhook/triage-webhook.controller.ts

import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks/triage')
@UseGuards(ApiKeyGuard)
export class TriageWebhookController {
  private readonly logger = new Logger(TriageWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

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
      `Webhook recibido: turno-creado - Turno: ${payload.turno_id}, Paciente: ${payload.paciente_id}`,
    );

    return { received: true, event: 'turno-creado' };
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
      `Webhook recibido: turno-cancelado - Turno: ${payload.turno_id}, Razón: ${payload.razon}`,
    );

    return { received: true, event: 'turno-cancelado' };
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
      `Webhook recibido: paciente-atendido - Turno: ${payload.turno_id}, Diagnóstico: ${payload.diagnostico}`,
    );

    return { received: true, event: 'paciente-atendido' };
  }
}