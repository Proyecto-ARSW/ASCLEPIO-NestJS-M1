import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * AppThrottlerGuard extiende el ThrottlerGuard por defecto para manejar
 * correctamente los tres tipos de contexto que existen en esta app:
 *
 *  - http   → endpoints REST normales (login, register, etc.)
 *  - graphql → queries y mutations GraphQL (vienen por HTTP, pero el contexto
 *               está envuelto en ApolloServer; se necesita GqlExecutionContext
 *               para extraer el req original)
 *  - ws     → subscripciones GraphQL via graphql-ws (conexión WebSocket pura;
 *               no existe un objeto Request HTTP y no tiene sentido throttlear
 *               por IP aquí, así que se omite)
 *
 * Sin este guard, el ThrottlerGuard base llama a
 *   context.switchToHttp().getRequest()
 * en contextos ws/graphql y obtiene `undefined`, lo que produce el error:
 *   "Cannot read properties of undefined (reading 'ip')"
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  /**
   * Saltamos el throttle para contextos WebSocket (subscripciones).
   * Las suscripciones son conexiones persistentes; no tiene sentido
   * contarlas como peticiones individuales por IP.
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // context.getType() devuelve 'http' | 'graphql' | 'ws' según el adapter
    return context.getType<string>() === 'ws';
  }

  /**
   * Devuelve el par { req, res } según el tipo de contexto.
   * Para GraphQL usamos GqlExecutionContext para acceder al req HTTP subyacente
   * (Apollo recibe la petición HTTP y la expone en ctx.req).
   */
  getRequestResponse(context: ExecutionContext) {
    const type = context.getType<string>();

    if (type === 'graphql') {
      // GqlExecutionContext expone el contexto que configura GraphQLModule:
      //   context: ({ req }) => ({ req })    ← app.module.ts
      const gqlCtx = GqlExecutionContext.create(context);
      const req = gqlCtx.getContext<{ req: Record<string, any> }>().req;
      // res puede no existir en algunos setups; usamos un objeto vacío como
      // fallback seguro para que res.header() no explote al setear headers.
      return { req, res: req?.res ?? ({} as Record<string, any>) };
    }

    // Contexto HTTP estándar (REST)
    const http = context.switchToHttp();
    return { req: http.getRequest(), res: http.getResponse() };
  }

  /**
   * Extrae el identificador de la petición para la clave de throttle.
   * Orden de preferencia:
   *   1. req.ip (Express/NestJS lo resuelve automáticamente con trust proxy)
   *   2. x-forwarded-for (cuando hay un proxy/load-balancer delante)
   *   3. 'anonymous' como último recurso (nunca debería llegar aquí en contextos HTTP)
   */
  async getTracker(req: Record<string, any>): Promise<string> {
    return (
      req?.ip ??
      (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      'anonymous'
    );
  }
}

// Daniel Useche
