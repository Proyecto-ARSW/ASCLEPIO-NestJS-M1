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
    } catch (err) {
      this.logger.warn(`RabbitMQ connection failed at startup: ${err.message}. Events will be retried on emit.`);
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
          error: (err) =>
            this.logger.error(`Failed to emit appointment-created: ${err.message}`),
        });
    } catch (err) {
      this.logger.error(`notifyAppointmentCreated error: ${err.message}`);
    }
  }

  async notifyAppointmentCancelled(citaId: string, cancellationReason?: string): Promise<void> {
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
          error: (err) =>
            this.logger.error(`Failed to emit appointment-cancelled: ${err.message}`),
        });
    } catch (err) {
      this.logger.error(`notifyAppointmentCancelled error: ${err.message}`);
    }
  }

  notifyUserRegistered(email: string, name: string, verificationUrl?: string): void {
    try {
      this.client
        .emit('notification.user.registered', { email, name, verificationUrl })
        .subscribe({
          error: (err) =>
            this.logger.error(`Failed to emit user-registered: ${err.message}`),
        });
    } catch (err) {
      this.logger.error(`notifyUserRegistered error: ${err.message}`);
    }
  }
}
