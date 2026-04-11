import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram, Counter } from 'prom-client';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import type { GraphQLResolveInfo } from 'graphql';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly duration: Histogram<string>,

    @InjectMetric('http_requests_total')
    private readonly requestsTotal: Counter<string>,

    @InjectMetric('graphql_operation_duration_seconds')
    private readonly gqlDuration: Histogram<string>,

    @InjectMetric('graphql_operations_total')
    private readonly gqlTotal: Counter<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isGraphQL = context.getType<string>() === 'graphql';
    const startTime = Date.now();

    if (isGraphQL) {
      const gqlCtx = GqlExecutionContext.create(context);
      const info = gqlCtx.getInfo<GraphQLResolveInfo>();
      const operationName = info?.fieldName || 'unknown';
      const operationType = info?.parentType?.name || 'unknown';

      return next.handle().pipe(
        tap({
          next: () => {
            const duration = (Date.now() - startTime) / 1000;
            this.gqlDuration.observe(
              {
                operation: operationName,
                type: operationType,
                status: 'success',
              },
              duration,
            );
            this.gqlTotal.inc({
              operation: operationName,
              type: operationType,
              status: 'success',
            });
          },
          error: () => {
            const duration = (Date.now() - startTime) / 1000;
            this.gqlDuration.observe(
              {
                operation: operationName,
                type: operationType,
                status: 'error',
              },
              duration,
            );
            this.gqlTotal.inc({
              operation: operationName,
              type: operationType,
              status: 'error',
            });
          },
        }),
      );
    }

    // REST HTTP
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();
    const method = req.method;
    const route = req.originalUrl || req.url || 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = String(res.statusCode);

          this.duration.observe(
            { method, route, status_code: statusCode },
            duration,
          );
          this.requestsTotal.inc({ method, route, status_code: statusCode });
        },
        error: (error: unknown) => {
          const statusCode = this.resolveErrorStatusCode(error);
          const duration = (Date.now() - startTime) / 1000;

          this.duration.observe(
            { method, route, status_code: statusCode },
            duration,
          );
          this.requestsTotal.inc({ method, route, status_code: statusCode });
        },
      }),
    );
  }

  private resolveErrorStatusCode(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const maybeError = error as { status?: unknown; statusCode?: unknown };
      if (typeof maybeError.status === 'number') {
        return String(maybeError.status);
      }
      if (typeof maybeError.statusCode === 'number') {
        return String(maybeError.statusCode);
      }
    }

    return '500';
  }
}

// Daniel Useche
