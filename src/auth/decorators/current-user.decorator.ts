import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { user: JwtPayload };

/**
 * Extrae el usuario autenticado del JWT desde contexto REST o GraphQL.
 * @example currentUser: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const ctxType = context.getType<string>();
    if (ctxType === 'http') {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      return request.user;
    }

    const gqlContext = GqlExecutionContext.create(context).getContext<{
      req: AuthenticatedRequest;
    }>();
    return gqlContext.req.user;
  },
);

// Daniel Useche
