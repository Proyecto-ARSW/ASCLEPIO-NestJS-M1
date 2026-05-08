import {
  Controller,
  Post,
  Body,
  Logger,
  UseGuards,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { TurnService } from '../turn/turn.service';
import { TipoTurno } from '../turn/entities/turn.entity';
import { TurnoCreadoWebhookDto } from './dto/turno-creado-webhook.dto';
import { TurnoCanceladoWebhookDto } from './dto/turno-cancelado-webhook.dto';
import { PacienteAtendidoWebhookDto } from './dto/paciente-atendido-webhook.dto';

@Controller('webhooks/triage')
@UseGuards(ApiKeyGuard)
export class TriageWebhookController {
  private readonly logger = new Logger(TriageWebhookController.name);

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly turnService: TurnService,
  ) {}

  @Post('turno-creado')
  async handleTurnoCreado(@Body() payload: TurnoCreadoWebhookDto) {
    this.logger.log(
      `Webhook: turno-creado — Turno #${payload.numero_turno}, Paciente: ${payload.paciente_id}`,
    );

    try {
      let tipo: TipoTurno;
      if (payload.tipo_turno === 'URGENCIA') {
        tipo = TipoTurno.URGENTE;
      } else if (payload.tipo_turno === 'PRIORITARIO') {
        tipo = TipoTurno.PRIORITARIO;
      } else {
        tipo = TipoTurno.NORMAL;
      }

      await this.turnService.create({
        pacienteId: payload.paciente_id,
        hospitalId: payload.hospital_id,
        tipo,
      });

      this.rabbitmq.notifyTriageTurnoCreado(payload);

      this.logger.log(
        `Turno de triage ingresado a la cola de M1 — Paciente: ${payload.paciente_id}`,
      );

      return {
        received: true,
        event: 'turno-creado',
        turno_id: payload.turno_id,
        status: 'created',
      };
    } catch (error: any) {
      if (error instanceof ConflictException) {
        this.logger.warn(
          `Turno ya existente en M1 para paciente ${payload.paciente_id}; webhook tratado como idempotente`,
        );

        return {
          received: true,
          event: 'turno-creado',
          turno_id: payload.turno_id,
          status: 'already_exists',
        };
      }

      this.logger.error(
        `No se pudo crear turno en M1 desde webhook de triage: ${error?.message}`,
      );
      throw new InternalServerErrorException(
        'Error al procesar el webhook turno-creado',
      );
    }
  }

  @Post('turno-cancelado')
  async handleTurnoCancelado(@Body() payload: TurnoCanceladoWebhookDto) {
    this.logger.log(
      `Webhook: turno-cancelado — Turno #${payload.numero_turno}, Razón: ${payload.razon}`,
    );

    try {
      await this.turnService.cancelarTurnoPorWebhook(
        payload.paciente_id,
        payload.hospital_id,
      );
    } catch (error: any) {
      this.logger.error(
        `No se pudo cancelar turno en M1 desde webhook de triage: ${error?.message}`,
      );
      throw new InternalServerErrorException(
        'Error al procesar el webhook turno-cancelado',
      );
    }

    this.rabbitmq.notifyTriageTurnoCancelado(payload);
    return {
      received: true,
      event: 'turno-cancelado',
      turno_id: payload.turno_id,
    };
  }

  @Post('paciente-atendido')
  async handlePacienteAtendido(@Body() payload: PacienteAtendidoWebhookDto) {
    this.logger.log(
      `Webhook: paciente-atendido — Turno #${payload.numero_turno}, Paciente: ${payload.paciente_id}`,
    );

    try {
      const updated = await this.turnService.marcarTurnoAtendidoPorWebhook(
        payload.paciente_id,
        payload.hospital_id,
      );
      this.logger.log(`Turnos cerrados en M1: ${updated}`);
    } catch (error: any) {
      this.logger.error(`Error cerrando turnos en M1: ${error?.message}`);
      throw new InternalServerErrorException(
        'Error al procesar el webhook paciente-atendido',
      );
    }

    this.rabbitmq.notifyTriagePacienteAtendido(payload);
    return {
      received: true,
      event: 'paciente-atendido',
      turno_id: payload.turno_id,
    };
  }
}