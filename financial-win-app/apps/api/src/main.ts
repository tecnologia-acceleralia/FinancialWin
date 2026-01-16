import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
// import { runMigrationsOnStartup } from './utils/run-migrations';

async function bootstrap() {
  // CRITICAL: Ejecutar migraciones antes de iniciar la aplicación en producción
  // Esto asegura que la base de datos esté actualizada antes de servir requests
  // const migrationsSuccess = await runMigrationsOnStartup();
  // if (!migrationsSuccess && process.env.NODE_ENV === 'production') {
  //   // En producción, si las migraciones fallan, no iniciar la aplicación
  //   console.error(
  //     '❌ La aplicación no se iniciará debido a errores en las migraciones'
  //   );
  //   process.exit(1);
  // }
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security: Helmet sets various HTTP headers to help protect the app
  app.use(helmet());

  // Performance: Compression middleware for response compression
  app.use(compression());

  // Add cookie parser middleware
  app.use(cookieParser());

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Temporalmente deshabilitado para debuggear
      transform: true,
    })
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new LoggingInterceptor()
  );

  // CORS configuration - Parse comma-separated origins into array
  if (!process.env.CORS_ORIGIN) {
    throw new Error('❌ FATAL: CORS_ORIGIN environment variable is required');
  }
  const corsOrigins = process.env.CORS_ORIGIN.split(',').map(origin =>
    origin.trim()
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Additional security headers (Helmet handles most, but we add custom ones)
  app.use((req, res, next) => {
    // Custom security headers if needed
    // Note: Helmet already handles most security headers
    next();
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('roy API')
    .setDescription(
      'API REST base construida con NestJS. Incluye autenticación OIDC multi-tenant, gestión de archivos, y documentación Swagger completa.'
    )
    .setVersion('1.0.0')
    .addTag('health', 'Health checks y estado del sistema')
    .addTag('auth', 'Autenticación y autorización OIDC')
    .addTag('storage', 'Gestión de archivos y almacenamiento')
    .addTag('webhooks', 'Webhooks y eventos externos')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addCookieAuth('oauth_session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'oauth_session',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || '';
  await app.listen(port);

  console.log(`🚀 financial-win API running on http://localhost:${port}`);
  console.log(
    `📚 API Documentation available at http://localhost:${port}/api/docs`
  );
}

bootstrap().catch(error => {
  console.error('❌ Error starting application:', error);
  process.exit(1);
});
