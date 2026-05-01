import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyRequest } from 'fastify';

/**
 * Guard JWT compatible con REST y GraphQL.
 * Para GraphQL extrae el request del contexto de Apollo.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext): FastifyRequest {
    const ctxType = context.getType<string>();
    if (ctxType === 'http') {
      return context.switchToHttp().getRequest<FastifyRequest>();
    }

    // GraphQL context
    const gqlCtx = GqlExecutionContext.create(context).getContext<{
      req: FastifyRequest;
    }>();
    return gqlCtx.req;
  }
}

// Daniel Useche
