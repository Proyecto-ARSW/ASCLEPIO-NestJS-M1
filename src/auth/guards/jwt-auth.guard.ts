import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/**
 * Guard JWT compatible con REST y GraphQL.
 * Para GraphQL extrae el request del contexto de Apollo.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext): Request {
    const ctxType = context.getType<string>();
    if (ctxType === 'http') {
      return context.switchToHttp().getRequest();
    }

    // GraphQL context
    const gqlCtx = GqlExecutionContext.create(context).getContext<{
      req: Request;
    }>();
    return gqlCtx.req;
  }
}

// Daniel Useche
