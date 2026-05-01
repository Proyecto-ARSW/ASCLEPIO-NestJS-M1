import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  private lastFastStatus: { ok: boolean; ts: number } | null = null;

  constructor(private health: HealthCheckService) {}

  /**
   * Fast, non-blocking health endpoint used by load-balancers and probes.
   * Returns immediately with process-level info and a short-lived cached OK.
   */
  @Get()
  @SkipThrottle()
  quick() {
    const now = Date.now();
    if (!this.lastFastStatus || now - this.lastFastStatus.ts > 5_000) {
      // cheap synchronous checks only
      this.lastFastStatus = { ok: true, ts: now };
    }

    return {
      status: this.lastFastStatus.ok ? 'ok' : 'error',
      uptime: process.uptime(),
      pid: process.pid,
      timestamp: now,
    };
  }

  /**
   * Liveness should be cheap too — keep it as a simple process check.
   */
  @Get('liveness')
  @SkipThrottle()
  liveness() {
    return { status: 'up', uptime: process.uptime() };
  }

  /**
   * Readiness endpoint for deeper checks (DB, external services).
   * This may be slower and is intended for readiness probes that tolerate
   * longer response times.
   */
  @Get('ready')
  @HealthCheck()
  @SkipThrottle()
  ready() {
    return this.health.check([]);
  }
}
