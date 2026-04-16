import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay roles definidos, solo se requiere estar autenticado
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = this.getRequest(context);
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    if (!requiredRoles.includes(user.rol)) {
      throw new ForbiddenException(
        `Acceso denegado. Roles permitidos: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }

  private getRequest(context: ExecutionContext): AuthenticatedRequest {
    const ctxType = context.getType<string>();
    if (ctxType === 'http') {
      return context.switchToHttp().getRequest<AuthenticatedRequest>();
    }

    const gqlContext = GqlExecutionContext.create(context).getContext<{
      req: AuthenticatedRequest;
    }>();
    return gqlContext.req;
  }
}

// Daniel Useche
