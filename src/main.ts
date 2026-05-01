import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { setupSwagger } from './docs/swagger.setup';
import { PrismaExceptionFilter } from './shared/filters/prisma-exception.filter';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: 1 }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  const isProduction = process.env.NODE_ENV === 'production';

  // @fastify/helmet registra headers de seguridad HTTP como plugin de Fastify.
  // Debe registrarse antes de CORS y rutas.
  // trustProxy: 1 (en FastifyAdapter) confía exactamente en 1 hop de proxy, igual
  // que el antiguo "trust proxy = 1" de Express: Azure App Service envía la IP real
  // del cliente en X-Forwarded-For, y Fastify la usa como req.ip para el throttler.
  // Con trustProxy: true se confiaría en TODOS los proxies, permitiendo spoofing.
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
        connectSrc: ["'self'", frontendUrl],
        fontSrc: ["'self'", 'data:'],
        frameSrc: ["'none'"],
      },
    },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  // Swagger disponible en /docs
  setupSwagger(app);

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

}

void bootstrap();

// Daniel Useche
