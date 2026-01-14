const path = require('path');
const fs = require('fs');

// Cargar variables de entorno de forma segura
// Prioridad: test/test.env > .env.dev > .env > variables del sistema
const testEnvPath = path.resolve(__dirname, 'test/test.env');
if (fs.existsSync(testEnvPath)) {
  require('dotenv').config({ path: testEnvPath });
} else {
  // Fallback: usar .env.dev o .env si existe
  const envDevPath = path.resolve(__dirname, '.env.dev');
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envDevPath)) {
    require('dotenv').config({ path: envDevPath });
  } else if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
  // Si no existe ningún archivo, usar variables de entorno del sistema
}

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          // Usar el mismo tsconfig.json del proyecto
          tsconfig: path.resolve(__dirname, 'tsconfig.json'),
        },
      },
    ],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/main.ts',
    '!**/database/**',
    '!**/migrations/**',
    '!**/scripts/**',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    // Mapear paths de TypeScript desde tsconfig.json
    '^@/(.*)$': '<rootDir>/$1',
    '^@/common/(.*)$': '<rootDir>/common/$1',
    '^@/modules/(.*)$': '<rootDir>/modules/$1',
    // Mantener compatibilidad con imports relativos
    '^src/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  verbose: true,
  // Ignorar archivos de node_modules y dist
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Configuración de módulos
  moduleDirectories: ['node_modules', '<rootDir>'],
};
