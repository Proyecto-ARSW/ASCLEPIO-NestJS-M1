import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { setupSwagger } from './docs/swagger.setup';
import { PrismaExceptionFilter } from './shared/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

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

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  const frontendUrl = configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.enableShutdownHooks();

  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`API running on port :${port}`, 'Bootstrap');
  logger.log(`Swagger docs → http://localhost:${port}/docs`, 'Bootstrap');
  logger.log(`GraphQL playground → http://localhost:${port}/graphql`, 'Bootstrap');
}

bootstrap();
