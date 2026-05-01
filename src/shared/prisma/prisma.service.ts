import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export type PrismaTx = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseNonNegativeInt(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const poolMax = parsePositiveInt(process.env.DB_POOL_MAX, 10);
    const poolMin = parseNonNegativeInt(process.env.DB_POOL_MIN, 1);

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Math.max(poolMin, poolMax),
      min: poolMin,
      idleTimeoutMillis: parsePositiveInt(
        process.env.DB_IDLE_TIMEOUT_MS,
        60_000,
      ),
      connectionTimeoutMillis: parsePositiveInt(
        process.env.DB_CONNECTION_TIMEOUT_MS,
        30_000,
      ),
      keepAlive: true,
      keepAliveInitialDelayMillis: parseNonNegativeInt(
        process.env.DB_KEEPALIVE_DELAY_MS,
        10_000,
      ),
      ssl:
        process.env.DATABASE_URL?.includes('sslmode=require') ||
        process.env.DATABASE_URL?.includes('ssl=true')
          ? {
              rejectUnauthorized:
                process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
            }
          : undefined,
    });

    super({ adapter: new PrismaPg(pool) });

    this.pool = pool;

    this.pool.on('error', (error) => {
      this.logger.error(`pg pool error: ${error.message}`);
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  private async connectWithRetry(): Promise<void> {
    const attempts = parsePositiveInt(process.env.DB_CONNECT_RETRIES, 5);
    const backoffMs = parsePositiveInt(
      process.env.DB_CONNECT_BACKOFF_MS,
      2_000,
    );

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) {
          this.logger.log(
            `Prisma connected after retry ${attempt}/${attempts}`,
          );
        }
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Prisma connect attempt ${attempt}/${attempts} failed: ${message}`,
        );

        if (attempt === attempts) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * attempt),
        );
      }
    }
  }
}
