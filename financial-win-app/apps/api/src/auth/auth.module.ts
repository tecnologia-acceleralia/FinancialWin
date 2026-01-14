import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OIDCService } from '../common/services/oidc.service';
import { OIDCAccessCheckService } from '../common/services/oidc-access-check.service';
import { OIDCConfig } from '../common/config/oidc.config';
import { JwtModule } from '@nestjs/jwt';
import { OIDCAuthGuard } from '../common/guards/oidc-auth.guard';

const logger = new Logger('AuthModule');

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [OIDCConfig],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Read JWT_SECRET ONLY from .env file via ConfigService
        // No fallbacks to hardcoded values or other sources
        const jwtSecret = configService.get<string>('JWT_SECRET');

        // Validate JWT_SECRET is configured and not empty
        if (!jwtSecret || jwtSecret.trim() === '') {
          const errorMsg =
            '❌ FATAL: JWT_SECRET is not configured or is empty.\n' +
            '   Please set JWT_SECRET in your .env file (e.g., .env.dev).\n' +
            '   Example: JWT_SECRET=your-secret-key-here-minimum-32-characters\n' +
            '   This value MUST match the JWT_SECRET in oidc-server/provider/.env\n' +
            '   Generate a secure value: openssl rand -base64 32';
          logger.error(errorMsg);
          throw new Error(errorMsg);
        }

        // Validate minimum length (32 characters recommended)
        if (jwtSecret.length < 32) {
          logger.warn(
            `⚠️ JWT_SECRET is shorter than recommended (${jwtSecret.length} chars, minimum 32 recommended)`
          );
        }

        // Log partial value for verification (first 10 chars + last 4 chars)
        const preview =
          jwtSecret.length > 14
            ? `${jwtSecret.substring(0, 10)}...${jwtSecret.substring(jwtSecret.length - 4)}`
            : `${jwtSecret.substring(0, Math.min(10, jwtSecret.length))}...`;
        logger.log(
          `✅ JWT_SECRET loaded successfully (length: ${jwtSecret.length}, preview: ${preview})`
        );

        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '24h' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [OIDCService, OIDCAccessCheckService, OIDCAuthGuard],
  exports: [
    OIDCService,
    OIDCAccessCheckService,
    OIDCAuthGuard,
    JwtModule,
    ConfigModule,
  ], // Export ConfigModule so ConfigService is available to modules using OIDCAuthGuard
})
export class AuthModule {}
