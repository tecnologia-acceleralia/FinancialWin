#!/usr/bin/env node

/**
 * Reset Development Database Script
 * 
 * This script drops the local development database, recreates it, and runs all migrations.
 * 
 * WARNING: This will DELETE ALL DATA in the local development database.
 * 
 * Usage:
 *   pnpm migration:dev:reset
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for output
const RED = '\033[0;31m';
const GREEN = '\033[0;32m';
const YELLOW = '\033[1;33m';
const BLUE = '\033[0;34m';
const NC = '\033[0m'; // No Color

function printStatus(message) {
  console.log(`${GREEN}[INFO]${NC} ${message}`);
}

function printWarning(message) {
  console.log(`${YELLOW}[WARNING]${NC} ${message}`);
}

function printError(message) {
  console.log(`${RED}[ERROR]${NC} ${message}`);
}

function printStep(message) {
  console.log(`${BLUE}[STEP]${NC} ${message}`);
}

// Check NODE_ENV
if (process.env.NODE_ENV === 'production') {
  printError('This script cannot be run in production environment!');
  printError('Set NODE_ENV to development or unset it.');
  process.exit(1);
}

// Load environment variables
const envPath = path.join(__dirname, '../.env.dev');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  printStatus('Loaded environment variables from .env.dev');
} else {
  printWarning('.env.dev not found, using system environment variables');
}

// Get database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'financial-win_db',
};

// Parse DATABASE_URL if provided
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig.host = url.hostname;
  dbConfig.port = url.port || '5432';
  dbConfig.username = url.username;
  dbConfig.password = url.password;
  dbConfig.database = url.pathname.slice(1); // Remove leading '/'
}

printWarning('⚠️  WARNING: This will DELETE ALL DATA in the development database!');
printWarning(`⚠️  Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
console.log('');

// Confirm action
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Type "yes" to continue, anything else to cancel: ', (answer) => {
  rl.close();

  if (answer.toLowerCase() !== 'yes') {
    printStatus('Operation cancelled.');
    process.exit(0);
  }

  try {
    // Step 1: Drop database
    printStep('Step 1: Dropping database...');
    try {
      execSync(
        `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "DROP DATABASE IF EXISTS ${dbConfig.database};"`,
        { stdio: 'inherit' }
      );
      printStatus('✅ Database dropped');
    } catch (error) {
      // Database might not exist, which is fine
      printWarning('Database might not exist (this is OK)');
    }

    // Step 2: Create database
    printStep('Step 2: Creating database...');
    execSync(
      `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "CREATE DATABASE ${dbConfig.database};"`,
      { stdio: 'inherit' }
    );
    printStatus('✅ Database created');

    // Step 3: Run migrations
    printStep('Step 3: Running migrations...');
    const dataSourcePath = path.join(__dirname, '../data-source.cjs');
    execSync(`node -r dotenv/config node_modules/.bin/typeorm migration:run -d ${dataSourcePath}`, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' },
    });
    printStatus('✅ Migrations executed');

    // Step 4: Check for seeds (optional)
    const seedsPath = path.join(__dirname, '../src/database/seeders');
    if (fs.existsSync(seedsPath)) {
      const seedFiles = fs.readdirSync(seedsPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
      if (seedFiles.length > 0) {
        printStep('Step 4: Seed files found (not auto-executed)');
        printWarning('To run seeds, execute them manually or add seed script');
      }
    }

    console.log('');
    printStatus('🎉 Development database reset completed successfully!');
    console.log('');
    printStatus(`Database: ${dbConfig.database}`);
    printStatus(`Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log('');
  } catch (error) {
    printError('Failed to reset database:');
    console.error(error.message);
    process.exit(1);
  }
});

