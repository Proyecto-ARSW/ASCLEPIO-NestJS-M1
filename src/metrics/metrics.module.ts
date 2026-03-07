import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule, makeHistogramProvider, makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true, // CPU, memoria, event loop de Node.js — gratis y automático
      },
      path: '/metrics',
    }),
  ],
  providers: [
    // ─── REST Metrics ───────────────────────────────────────
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),

    // ─── GraphQL Metrics ─────────────────────────────────────
    makeHistogramProvider({
      name: 'graphql_operation_duration_seconds',
      help: 'Duration of GraphQL operations in seconds',
      labelNames: ['operation', 'type', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    }),
    makeCounterProvider({
      name: 'graphql_operations_total',
      help: 'Total number of GraphQL operations',
      labelNames: ['operation', 'type', 'status'],
    }),

    // ─── Interceptor global ──────────────────────────────────
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class MetricsModule {}
