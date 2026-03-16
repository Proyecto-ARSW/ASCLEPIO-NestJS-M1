import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';
import { Prisma } from 'generated/prisma/client';
import { Response } from 'express';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const { status, message } = this.classify(exception);

    this.logger.error(
      `Prisma error → ${status}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const ctxType = host.getType<string>();

    if (ctxType === 'http') {
      const res = host.switchToHttp().getResponse<Response>();
      return res.status(status).json({
        statusCode: status,
        message,
        error: HttpStatus[status],
      });
    }

    // GraphQL — re-lanzar como Error estándar (Apollo lo convierte a error GraphQL)
    const gqlHost = GqlArgumentsHost.create(host);
    void gqlHost; // context disponible si se necesita
    throw new Error(message);
  }

  private classify(exception: unknown): { status: number; message: string } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            status: HttpStatus.CONFLICT,
            message: `Ya existe un registro con ese valor único (${(exception.meta?.target as string[])?.join(', ') ?? 'campo'}).`,
          };
        case 'P2003':
          return {
            status: HttpStatus.BAD_REQUEST,
            message: `Referencia inválida: el registro relacionado no existe.`,
          };
        case 'P2025':
          return {
            status: HttpStatus.NOT_FOUND,
            message: `Registro no encontrado.`,
          };
        default:
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: `Error de base de datos (${exception.code}).`,
          };
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Error de validación en la consulta a la base de datos.',
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'No se pudo conectar a la base de datos.',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno de base de datos.',
    };
  }
}
