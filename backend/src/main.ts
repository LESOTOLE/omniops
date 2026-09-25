import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security Headers via Helmet
  app.use(helmet({ contentSecurityPolicy: false }));

  // Compression
  app.use(compression());

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global Validation Pipe with class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Response Interceptor
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OmniOps API Engine')
    .setDescription(
      'Integrated B2B Operations & Multi-Store Inventory Platform RESTful API',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`OmniOps Backend Server running on: http://localhost:${port}/api`);
  logger.log(`Swagger OpenAPI Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
