import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Extrae el usuario autenticado del JWT desde contexto REST o GraphQL.
 * @example currentUser: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const ctxType = context.getType<string>();
    if (ctxType === 'http') {
      return context.switchToHttp().getRequest().user;
    }
    return GqlExecutionContext.create(context).getContext().req.user;
  },
);
