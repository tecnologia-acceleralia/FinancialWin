# Testing Guide

Esta carpeta contiene la configuración y utilidades para tests en el proyecto.

## Estructura

```
apps/api/test/
├── jest-e2e.json          # Configuración de Jest para tests e2e
├── setup-e2e.ts           # Setup global para tests e2e (con base de datos real)
├── setup.ts                # Setup global para tests unitarios (SQLite en memoria)
└── utils/
    └── jwt-helper.ts       # Helper para generar tokens JWT de prueba
```

## Tipos de Tests

### Tests Unitarios

Los tests unitarios usan SQLite en memoria y no requieren una base de datos real.

**Setup**: `setup.ts`
- Configura TypeORM con SQLite en memoria
- Sincroniza automáticamente el esquema
- Ideal para tests rápidos de servicios y lógica de negocio

**Ejemplo**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from '../src/your-module/your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Tests E2E (End-to-End)

Los tests e2e requieren una base de datos PostgreSQL real y prueban la aplicación completa.

**Setup**: `setup-e2e.ts`
- Configura la aplicación NestJS completa
- Requiere variables de entorno configuradas
- Ideal para tests de integración y seguridad

**Requisitos**:
- Base de datos PostgreSQL corriendo
- Variables de entorno configuradas (`.env` o `.env.local`)
  - `DATABASE_URL` o variables de conexión (`DB_HOST`, `DB_PORT`, etc.)
  - `JWT_SECRET` para autenticación

**Ejemplo**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtTestHelper } from './utils/jwt-helper';

describe('YourController (e2e)', () => {
  let app: INestApplication;
  let jwtHelper: JwtTestHelper;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtHelper = new JwtTestHelper(process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await app.close();
  });

  it('/your-endpoint (GET)', () => {
    const token = jwtHelper.generateToken({
      sub: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      company_id: 'test-company',
    });

    return request(app.getHttpServer())
      .get('/your-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
```

## Utilidades

### JwtTestHelper

Helper para generar tokens JWT de prueba con la misma estructura que el flujo de autenticación real.

```typescript
import { JwtTestHelper } from './utils/jwt-helper';

const jwtHelper = new JwtTestHelper(process.env.JWT_SECRET || 'test-secret');

// Generar token
const token = jwtHelper.generateToken({
  sub: 'user-id',
  email: 'user@example.com',
  name: 'User Name',
  company_id: 'company-id',
});

// Obtener header de autorización
const authHeader = jwtHelper.getAuthHeader(token); // "Bearer <token>"

// Obtener cookie
const cookie = jwtHelper.getCookieValue(token, 'oauth_session');
```

## Ejecutar Tests

### Todos los tests
```bash
cd apps/api
npm run test
```

### Solo tests unitarios
```bash
cd apps/api
npm run test:unit
```

### Solo tests e2e
```bash
cd apps/api
npm run test:e2e
```

### Un archivo específico
```bash
cd apps/api
npm run test:e2e -- your-test.e2e-spec.ts
```

## Configuración

### Variables de Entorno para Tests

Crea un archivo `.env.test` o configura las siguientes variables:

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/test_db
# O alternativamente:
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=test_user
DB_PASSWORD=test_password
DB_NAME=test_db

# Autenticación
JWT_SECRET=test-secret-key

# Otros
NODE_ENV=test
```

## Mejores Prácticas

1. **Tests Unitarios**: Usa `setup.ts` para tests rápidos que no requieren base de datos real
2. **Tests E2E**: Usa `setup-e2e.ts` para tests de integración que prueban la aplicación completa
3. **Limpieza**: Siempre limpia los datos de prueba en `afterAll` o `afterEach`
4. **Aislamiento**: Cada test debe ser independiente y no depender de otros tests
5. **Tokens**: Usa `JwtTestHelper` para generar tokens consistentes en todos los tests
6. **Base de Datos**: Usa una base de datos separada para tests (no la de desarrollo)

## Troubleshooting

### Error: "Cannot connect to database"
- Verifica que PostgreSQL esté corriendo
- Verifica las variables de entorno de conexión
- Verifica que las migraciones estén aplicadas (para tests e2e)

### Error: "JWT_SECRET not found"
- Agrega `JWT_SECRET` a tu archivo `.env` o `.env.local`
- Puedes usar cualquier valor para testing (ej: `test-secret`)

### Error: "Table does not exist"
- Para tests e2e: Ejecuta las migraciones: `npm run migration:run`
- Para tests unitarios: Verifica que las entidades estén correctamente importadas

### Tests lentos
- Usa tests unitarios con SQLite en memoria cuando sea posible
- Limita los tests e2e a casos críticos de integración
- Considera usar `jest.setTimeout()` para tests que requieren más tiempo

