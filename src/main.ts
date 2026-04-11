import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { setupSwagger } from './docs/swagger.setup';
import { PrismaExceptionFilter } from './shared/filters/prisma-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  const frontendUrl = configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  const isProduction = process.env.NODE_ENV === 'production';

  /**
   * Helmet agrega headers HTTP de seguridad en cada respuesta:
   * - X-Frame-Options: DENY → impide que la app sea embebida en iframes (clickjacking)
   * - X-Content-Type-Options: nosniff → evita que el browser interprete MIME types incorrectos
   * - Content-Security-Policy → restringe de dónde se puede cargar contenido
   * - HSTS → fuerza HTTPS en producción (el browser nunca retrocede a HTTP)
   * Debe ir ANTES de CORS y de cualquier middleware de rutas.
   */
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Apollo Sandbox y GraphQL Playground requieren inline scripts
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'embeddable-sandbox.cdn.apollographql.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
          connectSrc: ["'self'", frontendUrl],
          fontSrc: ["'self'", 'data:'],
          frameSrc: ["'none'"],
        },
      },
      // HSTS solo en producción: fuerza HTTPS por 1 año con subdomains
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
      // Oculta el header X-Powered-By para no revelar el stack tecnológico
      hidePoweredBy: true,
    }),
  );

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

  const logger = app.get(Logger);
  logger.log(`API running on port :${port}`, 'Bootstrap');
  logger.log(`Swagger docs → http://localhost:${port}/docs`, 'Bootstrap');
  logger.log(`GraphQL playground → http://localhost:${port}/graphql`, 'Bootstrap');
}

bootstrap();

// Daniel Useche
