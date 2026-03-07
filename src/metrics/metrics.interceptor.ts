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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isGraphQL = context.getType<string>() === 'graphql';
    const startTime = Date.now();

    if (isGraphQL) {
      const gqlCtx = GqlExecutionContext.create(context);
      const info = gqlCtx.getInfo();
      const operationName = info?.fieldName || 'unknown';
      const operationType = info?.parentType?.name || 'unknown';

      return next.handle().pipe(
        tap({
          next: () => {
            const duration = (Date.now() - startTime) / 1000;
            this.gqlDuration.observe(
              { operation: operationName, type: operationType, status: 'success' },
              duration,
            );
            this.gqlTotal.inc({ operation: operationName, type: operationType, status: 'success' });
          },
          error: (err) => {
            const duration = (Date.now() - startTime) / 1000;
            this.gqlDuration.observe(
              { operation: operationName, type: operationType, status: 'error' },
              duration,
            );
            this.gqlTotal.inc({ operation: operationName, type: operationType, status: 'error' });
          },
        }),
      );
    }

    // REST HTTP
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const route = req.route?.path || req.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = String(res.statusCode);

          this.duration.observe({ method, route, status_code: statusCode }, duration);
          this.requestsTotal.inc({ method, route, status_code: statusCode });
        },
        error: (err) => {
          const statusCode = err.status ? String(err.status) : '500';
          const duration = (Date.now() - startTime) / 1000;

          this.duration.observe({ method, route, status_code: statusCode }, duration);
          this.requestsTotal.inc({ method, route, status_code: statusCode });
        },
      }),
    );
  }
}
