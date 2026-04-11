import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

type ThrottlerRequest = {
  [key: string]: any;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  res?: Record<string, any>;
};

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
  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    // context.getType() devuelve 'http' | 'graphql' | 'ws' según el adapter
    return Promise.resolve(context.getType<string>() === 'ws');
  }

  /**
   * Devuelve el par { req, res } según el tipo de contexto.
   * Para GraphQL usamos GqlExecutionContext para acceder al req HTTP subyacente
   * (Apollo recibe la petición HTTP y la expone en ctx.req).
   */
  getRequestResponse(context: ExecutionContext): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    const type = context.getType<string>();

    if (type === 'graphql') {
      // GqlExecutionContext expone el contexto que configura GraphQLModule:
      //   context: ({ req }) => ({ req })    ← app.module.ts
      const gqlCtx = GqlExecutionContext.create(context);
      const gqlContext = gqlCtx.getContext<{
        req?: ThrottlerRequest;
        res?: Record<string, any>;
      }>();
      const req = gqlContext.req ?? {};
      // res puede no existir en algunos setups; usamos un objeto vacío como
      // fallback seguro para que res.header() no explote al setear headers.
      return { req, res: gqlContext.res ?? req.res ?? {} };
    }

    // Contexto HTTP estándar (REST)
    const http = context.switchToHttp();
    return {
      req: http.getRequest<ThrottlerRequest>(),
      res: http.getResponse<Record<string, any>>(),
    };
  }

  /**
   * Extrae el identificador de la petición para la clave de throttle.
   * Orden de preferencia:
   *   1. req.ip (Express/NestJS lo resuelve automáticamente con trust proxy)
   *   2. x-forwarded-for (cuando hay un proxy/load-balancer delante)
   *   3. 'anonymous' como último recurso (nunca debería llegar aquí en contextos HTTP)
   */
  getTracker(req: ThrottlerRequest): Promise<string> {
    const forwarded = req.headers?.['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const tracker =
      req.ip ?? forwardedValue?.split(',')[0]?.trim() ?? 'anonymous';

    return Promise.resolve(tracker);
  }
}

// Daniel Useche
