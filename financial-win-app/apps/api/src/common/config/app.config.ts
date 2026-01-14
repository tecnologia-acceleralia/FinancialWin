import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const appConfigSchema = z.object({
  port: z.coerce.number().default(6006),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  corsOrigin: z.string().default('http://localhost:3008'),
  uploadDir: z.string().default('./uploads'),
  maxFileSizeMB: z.coerce.number().default(10),
  rateLimitRequests: z.coerce.number().default(100),
  rateLimitWindowSeconds: z.coerce.number().default(60),
  retentionDays: z.coerce.number().default(30),
  // OpenAI Configuration (optional)
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default('gpt-5'),
  openaiMaxTokens: z.coerce.number().default(1000),
  openaiTemperature: z.coerce.number().default(0.7),
  // Digital Ocean Spaces Configuration (optional - only required if using DO Spaces)
  // Use preprocess to convert undefined to empty string before validation
  bucketUrlStorage: z.preprocess(val => val ?? '', z.string()),
  doSpacesEndpoint: z.preprocess(val => val ?? '', z.string()),
  doSpacesRegion: z.preprocess(val => val ?? '', z.string()),
  doSpacesAccessKeyId: z.preprocess(val => val ?? '', z.string()),
  doSpacesSecretAccessKey: z.preprocess(val => val ?? '', z.string()),
  doSpacesBucketName: z.preprocess(val => val ?? '', z.string()),
  // JWT Configuration
  jwtSecret: z.string(),
  jwtExpiresIn: z.string().default('7d'),
  // File Access Security
  signedUrlExpirySeconds: z.coerce.number().default(3600),
  fileAccessTokenExpiryHours: z.coerce.number().default(24),
  maxDownloadsPerHour: z.coerce.number().default(10),
});

export type AppConfigValues = z.infer<typeof appConfigSchema>;

export const AppConfig = registerAs('app', (): AppConfigValues => {
  const config = {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN,
    uploadDir: process.env.UPLOAD_DIR,
    maxFileSizeMB: process.env.MAX_FILE_SIZE_MB,
    rateLimitRequests: process.env.RATE_LIMIT_REQUESTS,
    rateLimitWindowSeconds: process.env.RATE_LIMIT_WINDOW_SECONDS,
    retentionDays: process.env.RETENTION_DAYS,
    // OpenAI Configuration
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    openaiMaxTokens: process.env.OPENAI_MAX_TOKENS,
    openaiTemperature: process.env.OPENAI_TEMPERATURE,
    // Digital Ocean Spaces Configuration
    bucketUrlStorage: process.env.BUCKET_URL_STORAGE,
    doSpacesEndpoint: process.env.DO_SPACES_ENDPOINT,
    doSpacesRegion: process.env.DO_SPACES_REGION,
    doSpacesAccessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID,
    doSpacesSecretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY,
    doSpacesBucketName: process.env.DO_SPACES_BUCKET_NAME,
    // JWT Configuration
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    // File Access Security
    signedUrlExpirySeconds: process.env.SIGNED_URL_EXPIRY_SECONDS,
    fileAccessTokenExpiryHours: process.env.FILE_ACCESS_TOKEN_EXPIRY_HOURS,
    maxDownloadsPerHour: process.env.MAX_DOWNLOADS_PER_HOUR,
  };

  return appConfigSchema.parse(config);
});
