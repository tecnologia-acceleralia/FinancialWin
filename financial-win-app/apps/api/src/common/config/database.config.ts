import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const databaseConfigSchema = z.object({
  type: z.literal('postgres'),
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  username: z.string().default('postgres'),
  password: z.string().default('postgres'),
  database: z.string().default('tony_db'),
  url: z.string().optional(),
  synchronize: z.coerce.boolean().default(false),
  logging: z.coerce.boolean().default(false),
  ssl: z.coerce.boolean().default(false),
});

export type DatabaseConfigValues = z.infer<typeof databaseConfigSchema>;

export const DatabaseConfig = registerAs(
  'database',
  (): DatabaseConfigValues => {
    const databaseUrl = process.env.DATABASE_URL;

    let config: any = {
      type: 'postgres',
      host: process.env.DB_HOST || 'not_env_file_configured',
      port: parseInt(process.env.DB_PORT || '0000'),
      username: process.env.DB_USERNAME || 'not_env_file_configured',
      password: process.env.DB_PASSWORD || 'not_env_file_configured',
      database: process.env.DB_NAME || 'not_env_file_configured',
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      ssl:
        process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      // Migration settings
      migrations:
        process.env.NODE_ENV === 'production'
          ? [__dirname + '/../../migrations/*{.ts,.js}']
          : undefined,
      migrationsTableName: 'migrations',
      migrationsRun: false, // We run migrations manually
    };

    // Parse PostgreSQL URL if provided
    if (databaseUrl?.startsWith('postgresql://')) {
      config = {
        type: 'postgres',
        url: databaseUrl,
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        ssl:
          process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        // Migration settings
        migrations:
          process.env.NODE_ENV === 'production'
            ? [__dirname + '/../../migrations/*{.ts,.js}']
            : undefined,
        migrationsTableName: 'migrations',
        migrationsRun: false, // We run migrations manually
      };
    }

    return databaseConfigSchema.parse(config);
  }
);
