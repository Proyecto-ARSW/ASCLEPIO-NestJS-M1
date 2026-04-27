import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class RabbitmqService implements OnModuleInit {
  private readonly logger = new Logger(RabbitmqService.name);

  constructor(
    @Inject('NOTIFICATIONS_SERVICE') private readonly client: ClientProxy,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (error: unknown) {
      this.logger.warn(
        `RabbitMQ connection failed at startup: ${this.getErrorMessage(error)}. Events will be retried on emit.`,
      );
    }
  }

  async notifyAppointmentCreated(citaId: string): Promise<void> {
    try {
      const cita = await this.prisma.citas.findUnique({
        where: { id: citaId },
        include: {
          pacientes: { include: { usuarios: true } },
          medicos: { include: { usuarios: true, especialidades: true } },
        },
      });
      if (!cita) return;

      const fechaHora = new Date(cita.fecha_hora);

      this.client
        .emit('notification.appointment.created', {
          patientEmail: cita.pacientes.usuarios.email,
          patientName: `${cita.pacientes.usuarios.nombre} ${cita.pacientes.usuarios.apellido}`,
          doctorName: `${cita.medicos.usuarios.nombre} ${cita.medicos.usuarios.apellido}`,
          specialty: cita.medicos.especialidades.nombre,
          appointmentDate: fechaHora.toISOString().split('T')[0],
          appointmentTime: fechaHora.toTimeString().slice(0, 5),
          location: cita.medicos.consultorio ?? 'Por confirmar',
          appointmentId: cita.id,
        })
        .subscribe({
          error: (error: unknown) =>
            this.logger.error(
              `Failed to emit appointment-created: ${this.getErrorMessage(error)}`,
            ),
        });
    } catch (error: unknown) {
      this.logger.error(
        `notifyAppointmentCreated error: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async notifyAppointmentCancelled(
    citaId: string,
    cancellationReason?: string,
  ): Promise<void> {
    try {
      const cita = await this.prisma.citas.findUnique({
        where: { id: citaId },
        include: {
          pacientes: { include: { usuarios: true } },
          medicos: { include: { usuarios: true, especialidades: true } },
        },
      });
      if (!cita) return;

      const fechaHora = new Date(cita.fecha_hora);

      this.client
        .emit('notification.appointment.cancelled', {
          patientEmail: cita.pacientes.usuarios.email,
          patientName: `${cita.pacientes.usuarios.nombre} ${cita.pacientes.usuarios.apellido}`,
          doctorName: `${cita.medicos.usuarios.nombre} ${cita.medicos.usuarios.apellido}`,
          specialty: cita.medicos.especialidades.nombre,
          appointmentDate: fechaHora.toISOString().split('T')[0],
          appointmentTime: fechaHora.toTimeString().slice(0, 5),
          appointmentId: cita.id,
          cancellationReason,
        })
        .subscribe({
          error: (error: unknown) =>
            this.logger.error(
              `Failed to emit appointment-cancelled: ${this.getErrorMessage(error)}`,
            ),
        });
    } catch (error: unknown) {
      this.logger.error(
        `notifyAppointmentCancelled error: ${this.getErrorMessage(error)}`,
      );
    }
  }

  notifyUserRegistered(
    email: string,
    name: string,
    verificationUrl?: string,
  ): void {
    try {
      this.client
        .emit('notification.user.registered', { email, name, verificationUrl })
        .subscribe({
          error: (error: unknown) =>
            this.logger.error(
              `Failed to emit user-registered: ${this.getErrorMessage(error)}`,
            ),
        });
    } catch (error: unknown) {
      this.logger.error(
        `notifyUserRegistered error: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

    notifyTriageTurnoCreado(payload: {
    turno_id: string;
    numero_turno: number;
    hospital_id: number;
    paciente_id: string;
    tipo_turno: string;
    estado: string;
    fecha: string;
  }): void {
    try {
      this.client
        .emit('notification.triage.turno_creado', payload)
        .subscribe({
          error: (error: unknown) =>
            this.logger.error(
              `Failed to emit triage.turno_creado: ${this.getErrorMessage(error)}`,
            ),
        });
    } catch (error: unknown) {
      this.logger.error(
        `notifyTriageTurnoCreado error: ${this.getErrorMessage(error)}`,
      );
    }
  }

  notifyTriageTurnoCancelado(payload: {
    turno_id: string;
    hospital_id: number;
    paciente_id: string;
    numero_turno: number;
    razon: string;
  }): void {
    try {
      this.client
        .emit('notification.triage.turno_cancelado', payload)
        .subscribe({
          error: (error: unknown) =>
            this.logger.error(
              `Failed to emit triage.turno_cancelado: ${this.getErrorMessage(error)}`,
            ),
        });
    } catch (error: unknown) {
      this.logger.error(
        `notifyTriageTurnoCancelado error: ${this.getErrorMessage(error)}`,
      );
    }
  }

  notifyTriagePacienteAtendido(payload: {
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
  }): void {
    try {
      this.client
        .emit('notification.triage.paciente_atendido', payload)
        .subscribe({
          error: (error: unknown) =>
            this.logger.error(
              `Failed to emit triage.paciente_atendido: ${this.getErrorMessage(error)}`,
            ),
        });
    } catch (error: unknown) {
      this.logger.error(
        `notifyTriagePacienteAtendido error: ${this.getErrorMessage(error)}`,
      );
    }
  }
}

// Daniel Useche
