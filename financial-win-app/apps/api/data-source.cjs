const { DataSource } = require('typeorm');
const path = require('path');
const fs = require('fs');

// Load environment variables - prioritize .env.dev in development
// First, try to load .env.dev if it exists (for development)
const envDevPath = path.join(__dirname, '.env.dev');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envDevPath)) {
  require('dotenv').config({ path: envDevPath });
} else if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  // Fallback to default dotenv behavior
  require('dotenv').config();
}

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Database configuration
let databaseConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if provided
  // Detect SSL requirement from DATABASE_URL (Digital Ocean always requires SSL)
  const databaseUrl = process.env.DATABASE_URL;
  const requiresSSL =
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('sslmode=prefer') ||
    databaseUrl.includes('digitalocean.com') ||
    isProduction;

  // Configure SSL: rejectUnauthorized: false for self-signed certificates (Digital Ocean)
  const sslConfig = requiresSSL || process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false;

  databaseConfig = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [path.join(__dirname, 'dist/src/**/*.entity.js')],
    migrations: [path.join(__dirname, 'dist/migrations/*.js')],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: isDevelopment,
    ssl: sslConfig,
    migrationsRun: false,
    dropSchema: false,
    cache: false,
  };
} else {
  // Use individual connection parameters - validate all required variables
  const requiredVars = {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `❌ FATAL: Missing required database environment variables: ${missingVars.join(', ')}`
    );
  }

  const port = parseInt(process.env.DB_PORT);
  if (isNaN(port) || port <= 0) {
    throw new Error(
      `❌ FATAL: DB_PORT must be a valid positive integer, got: ${process.env.DB_PORT}`
    );
  }

  // Configure SSL for individual connection parameters
  const sslConfig = process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false;

  databaseConfig = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: port,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [path.join(__dirname, 'dist/src/**/*.entity.js')],
    migrations: [path.join(__dirname, 'dist/migrations/*.js')],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: isDevelopment,
    ssl: sslConfig,
    migrationsRun: false,
    dropSchema: false,
    cache: false,
  };
}

// Validate required environment variables for production
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error('❌ FATAL: DATABASE_URL is required in production environment');
}

module.exports = new DataSource(databaseConfig);