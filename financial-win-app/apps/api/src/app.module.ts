import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Common modules
import {
  DatabaseConfig,
  DatabaseConfigValues,
} from './common/config/database.config';
import { AppConfig } from './common/config/app.config';
import { OIDCConfig } from './common/config/oidc.config';

// Infrastructure modules
import { StorageModule } from './common/modules/storage.module';
import { AuthModule } from './auth/auth.module';
import { ExampleModule } from './modules/example/example.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { WebhookController } from './common/controllers/webhook.controller';
import { ObservabilityModule } from './common/modules/observability.module';
import { MetricsController } from './common/controllers/metrics.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, DatabaseConfig, OIDCConfig],
      // In Docker, prioritize environment variables over .env files
      // Only load .env files if not running in Docker (no DATABASE_URL from docker-compose)
      envFilePath: process.env.DATABASE_URL
        ? [] // Skip .env files if DATABASE_URL is set (from docker-compose)
        : [
            process.env.NODE_ENV === 'development' ? '.env.dev' : '.env.prod',
            '.env.local',
            '.env',
          ].filter(Boolean),
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useFactory: (databaseConfig: DatabaseConfigValues) => ({
        type: 'postgres',
        host: databaseConfig.host,
        port: databaseConfig.port,
        username: databaseConfig.username,
        password: databaseConfig.password,
        database: databaseConfig.database,
        url: databaseConfig.url,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: databaseConfig.synchronize,
        logging: databaseConfig.logging,
        ssl: false,
      }),
      inject: [DatabaseConfig.KEY],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '10') * 1000,
        limit: parseInt(process.env.RATE_LIMIT_REQUESTS || '3'),
      },
    ]),

    // Event emitter for application-wide events
    EventEmitterModule.forRoot(),

    // Auth module
    AuthModule,

    // Storage module
    StorageModule,

    // Observability module (metrics and tracing)
    ObservabilityModule,

    // Example module (demonstration module)
    ExampleModule,

    // Documents module
    DocumentsModule,
  ],
  controllers: [AppController, WebhookController, MetricsController],
  providers: [AppService],
})
export class AppModule {}
