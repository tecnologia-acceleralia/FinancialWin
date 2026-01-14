# financial-win App + OIDC Server

Un financial-win base para desarrollar aplicaciones full-stack con NestJS y React, incluyendo autenticación OIDC multi-tenant, infraestructura de base de datos y herramientas de desarrollo.

## 🚀 Características Principales

- **Backend NestJS**: API REST con TypeORM, validación, y documentación Swagger
- **Frontend React**: Vite + React + TypeScript con TanStack Query y Zustand
- **Autenticación OIDC**: Integración completa con oidc-server para multi-tenancy
- **Base de Datos**: PostgreSQL con migraciones y administración
- **Docker**: Configuración completa para desarrollo y producción
- **Hot-reload**: Desarrollo con watch mode y recarga automática

## 🏗️ Arquitectura

### Backend (NestJS LTS)

- **API REST** con documentación Swagger
- **Base de datos**: PostgreSQL (desarrollo y producción)
- **Autenticación**: OIDC integrado con oidc-server (multi-tenant)
- **Validación**: Zod + class-validator
- **Observabilidad**: Logs estructurados, métricas Prometheus (esqueleto), tracing OpenTelemetry (esqueleto)
- **Testing**: Jest (backend), Vitest (frontend) - ver `docs/TESTING.md`
- **Packages Compartidos**: `packages/shared-types` y `packages/shared-config` para código reutilizable
- **Dockerización**: Multi-stage builds optimizados
- **Hot-reload**: Desarrollo con watch mode

### Frontend (Vite + React + TypeScript)

- **Estado remoto**: TanStack Query
- **Estado local**: Zustand
- **UI**: Tailwind CSS + componentes personalizados
- **Autenticación**: OIDC flow con oidc-server
- **Accesibilidad**: WCAG AA

## 📁 Estructura del Proyecto

```
financial-win/
├── apps/
│   ├── api/                 # Backend NestJS
│   │   ├── src/
│   │   │   ├── common/      # Config, interceptors, filters, guards
│   │   │   ├── modules/     # Módulos de negocio (vacío - listo para agregar)
│   │   │   ├── auth/        # Módulo de autenticación OIDC
│   │   │   └── migrations/  # Migraciones de base de datos
│   │   ├── Dockerfile.dev   # Desarrollo (hot-reload)
│   │   └── package.json
│   └── web/                 # Frontend React
│       ├── src/
│       │   ├── pages/       # Rutas de la aplicación
│       │   ├── components/  # Componentes UI
│       │   ├── api/         # Clientes API
│       │   ├── contexts/    # Contextos React (Auth)
│       │   └── hooks/       # Custom hooks
│       ├── Dockerfile.dev   # Desarrollo (hot-reload)
│       └── package.json
├── scripts/                 # Scripts de automatización
│   ├── dev.sh               # Desarrollo local con Docker
│   ├── dev-robust.sh        # Desarrollo robusto (force rebuild)
│   ├── change-app-name.sh   # 🔧 Cambiar nombre de la aplicación
│   ├── change-ports.sh      # 🔧 Cambiar puertos de módulos
│   ├── clean.sh             # Limpieza del ambiente Docker
│   ├── migrate-prod.sh      # Migraciones de producción
│   ├── audit-controllers.ts # Auditoría de seguridad (controllers)
│   └── audit-services.ts    # Auditoría de seguridad (services)
├── docker-compose.dev.yml   # Desarrollo con hot-reload
└── package.json             # Workspace root
```

## 🚀 Scripts de Automatización

El proyecto incluye scripts automatizados para facilitar el desarrollo y despliegue:

### 📋 Lista de Scripts

| Script               | Propósito                        | Ambiente | Características                                           |
| -------------------- | -------------------------------- | -------- | --------------------------------------------------------- |
| `dev.sh`             | Desarrollo local                 | Local    | Hot-reload, PostgreSQL local, Health checks               |
| `dev-robust.sh`      | Desarrollo con limpieza completa | Local    | Limpieza completa, rebuild forzado, sin caché             |
| `change-app-name.sh` | Cambiar nombre de la aplicación  | Config   | Actualiza Docker, package.json, .env.example, docs        |
| `change-ports.sh`    | Cambiar puertos de módulos       | Config   | Actualiza puertos en docker-compose, .env.example, config |
| `clean.sh`           | Limpieza del ambiente            | Local    | Elimina contenedores, imágenes, volúmenes, redes          |

### 🔧 Detalles de Cada Script

#### **`./scripts/dev.sh`**

- **Propósito**: Configurar ambiente de desarrollo completo
- **Base de datos**: PostgreSQL local en contenedor
- **Características**:
  - ✅ Hot-reload completo (API + Web)
  - ✅ Volúmenes persistentes para datos
  - ✅ Health checks automáticos
  - ✅ Logs estructurados
  - ✅ Validación de Docker y docker-compose

#### **`./scripts/dev-robust.sh`**

- **Propósito**: Desarrollo con limpieza completa y rebuild forzado
- **Base de datos**: PostgreSQL local en contenedor
- **Características**:
  - ✅ Limpieza completa de contenedores e imágenes
  - ✅ Rebuild forzado sin caché
  - ✅ Validación de dependencias
  - ✅ Health checks exhaustivos
  - ✅ Útil cuando hay problemas de dependencias o caché

#### **`./scripts/change-app-name.sh`**

- **Propósito**: Cambiar el nombre de la aplicación en todo el proyecto
- **Uso**: `./scripts/change-app-name.sh [nombre-nuevo]`
- **Características**:
  - ✅ Actualiza nombres de contenedores Docker
  - ✅ Actualiza nombres de base de datos y usuarios
  - ✅ Actualiza `package.json` (root, api, web)
  - ✅ Actualiza `.env.example` (DB_USERNAME, DB_PASSWORD, DB_NAME, OIDC_CLIENT_ID, DATABASE_URL)
  - ✅ Actualiza `VITE_APP_NAME` en frontend
  - ✅ Actualiza documentación (README.md, .mdc)
  - ✅ Actualiza títulos de Swagger
  - ✅ Actualiza `COMPOSE_PROJECT_NAME` en archivos `.env`
  - ✅ Actualiza referencias en scripts y configuración

#### **`./scripts/change-ports.sh`**

- **Propósito**: Cambiar puertos de todos los módulos interactivamente
- **Uso**: `./scripts/change-ports.sh`
- **Características**:
  - ✅ Interfaz interactiva para cambiar puertos
  - ✅ Actualiza `docker-compose.dev.yml` (mapeo de puertos)
  - ✅ Actualiza `apps/api/.env.example` (PORT, DB_PORT, DATABASE_URL, CORS_ORIGIN, OIDC_REDIRECT_URI)
  - ✅ Actualiza `apps/web/.env.example` (VITE_API_URL)
  - ✅ Actualiza `apps/api/src/common/config/app.config.ts` (puerto por defecto)
  - ✅ Actualiza `apps/web/vite.config.ts` (puerto y proxy)
  - ✅ Mantiene puerto interno de PostgreSQL (5432) para conexiones Docker
  - ✅ Actualiza solo puerto del host para PostgreSQL

#### **`./scripts/clean.sh`**

- **Propósito**: Limpieza profunda del ambiente de desarrollo
- **Características**:
  - ✅ Detiene y elimina todos los contenedores de desarrollo
  - ✅ Elimina imágenes de desarrollo
  - ✅ Limpia recursos Docker no utilizados
  - ✅ Elimina volúmenes no utilizados
  - ✅ Elimina redes no utilizadas
  - ✅ Útil para resolver conflictos de puertos o problemas de caché

#### **`./scripts/audit-controllers.ts`** y **`./scripts/audit-services.ts`**

- **Propósito**: Auditoría automática de seguridad multi-tenant
- **Cuándo usar**:
  - ✅ Se ejecutan automáticamente antes de cada commit (pre-commit hook)
  - ✅ Ejecutar manualmente antes de hacer deploy: `pnpm audit:security`
  - ✅ Ejecutar cuando agregues nuevos endpoints o servicios
- **Características**:
  - ✅ Valida uso correcto de `@CompanyId()` en controllers tenant-scoped
  - ✅ Verifica que endpoints pasen `companyId` al servicio
  - ✅ Valida filtrado por `company_id` en servicios
  - ✅ Detecta queries SQL raw sin filtro de tenant
  - ✅ Genera reportes en Markdown y JSON
  - ✅ **Falla el commit si encuentra problemas de seguridad** (previene fugas de datos)
- **Uso manual**:

  ```bash
  # Auditoría completa
  pnpm audit:security

  # Solo controllers
  pnpm audit:controllers

  # Solo servicios
  pnpm audit:services
  ```

- **⚠️ IMPORTANTE**: Estos scripts son críticos para la seguridad multi-tenant. No desactives los pre-commit hooks sin revisar manualmente el código.

### 🎯 Uso Recomendado

#### **Para Desarrollo Diario**

```bash
# Configurar variables de entorno
cd apps/api
cp .env.example .env.dev
cp .env.example .env.prod

# Editar .env.dev con tus configuraciones locales

# Iniciar desarrollo
./scripts/dev.sh
```

### ⚡ Comandos Rápidos

```bash
# Iniciar desarrollo
./scripts/dev.sh
# Parar desarrollo
docker-compose -f docker-compose.dev.yml down

# Reiniciar servicios
docker-compose -f docker-compose.dev.yml restart

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Limpiar volúmenes (¡CUIDADO!)
docker-compose -f docker-compose.dev.yml down -v

# Desarrollo robusto (limpieza completa y rebuild)
./scripts/dev-robust.sh
# O usando pnpm
pnpm docker:dev:robust

# Cambiar nombre de la aplicación
./scripts/change-app-name.sh mi-nueva-app

# Cambiar puertos de módulos
./scripts/change-ports.sh

# Limpieza profunda del ambiente
./scripts/clean.sh

# Auditoría de seguridad multi-tenant (se ejecuta automáticamente en pre-commit)
pnpm audit:security
```

### 🔐 Integración con OIDC Server

Esta aplicación está integrado con **oidc-server** para autenticación y autorización multi-tenant.

#### **Iniciar Sistema Completo (OIDC + financial-win)**

```bash
# Terminal 1: Iniciar OIDC Server
cd ../oidc-server
docker compose up -d

# Terminal 2: Iniciar financial-win Project
cd financial-win-project
./scripts/dev.sh
```

#### **Configuración OIDC Requerida**

Asegúrate de tener configuradas las siguientes variables en `apps/api/.env.dev`:

```bash
# OIDC Configuration
OIDC_ISSUER_URL=http://host.docker.internal:5009
OIDC_PUBLIC_URL=http://localhost:5009
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=http://localhost:6000/api/auth/callback
OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3010
# CRITICAL: offline_access is required for refresh tokens
OIDC_SCOPES="openid email profile offline_access"

# JWT Secret (debe coincidir con oidc-server)
JWT_SECRET=your_jwt_secret_minimum_32_characters
```

#### **Endpoints de Autenticación**

- **Login**: `GET /api/auth/login` - Inicia flujo OIDC
- **Callback**: `GET /api/auth/callback` - Callback desde OIDC provider
- **Logout**: `GET /api/auth/logout` - Cierra sesión
- **Refresh**: `GET /api/auth/refresh` - Refresca token de sesión
- **Me**: `GET /api/auth/me` - Información del usuario actual

#### **Protección de Endpoints**

Los endpoints protegidos usan `@UseGuards(OIDCAuthGuard)` y requieren:

- Token de sesión en cookie `oauth_session` o
- Header `Authorization: Bearer <token>`

El guard valida automáticamente con oidc-server y verifica acceso de compañía al cliente.

**Documentación completa**: Ver `mdc/02-OIDC-INTEGRATION.mdc`

## 🛠️ Instalación y Desarrollo

### Prerrequisitos

- Node.js 22+ (ver `package.json` para versión exacta)
- pnpm 8.0+
- Docker & Docker Compose
- **OIDC Server**: Debe estar corriendo (ver sección de Integración OIDC)

**Servicios disponibles:**

- **API**: http://localhost:5000
- **Web**: http://localhost:3000
- **API Docs**: http://localhost:5000/api/docs
- **Adminer (DB Admin)**: http://localhost:8081
- **PostgreSQL**: localhost:5432
- **OIDC Provider**: http://localhost:5009 (requerido para autenticación)

### 🗄️ Administración de Base de Datos con Adminer

El proyecto incluye **Adminer** como herramienta de administración de base de datos para desarrollo local.

#### **Acceso a Adminer**

1. **Iniciar el ambiente de desarrollo:**

   ```bash
   ./scripts/dev.sh
   ```

2. **Abrir Adminer en el navegador:**
   ```
   http://localhost:8081
   ```

#### **Configuración de Conexión**

| Campo             | Valor          |
| ----------------- | -------------- |
| **Sistema**       | PostgreSQL     |
| **Servidor**      | `postgres`     |
| **Usuario**       | `financial-win`     |
| **Contraseña**    | `financial-win`     |
| **Base de datos** | `financial-win_dev` |

#### **Características de Adminer**

- ✅ **Interfaz web simple** y rápida
- ✅ **Visualización de tablas** y datos
- ✅ **Ejecución de consultas SQL**
- ✅ **Exportar/importar datos**
- ✅ **Muy ligero** (~10MB)
- ✅ **Acceso directo** desde el navegador

**Ubicación de archivos de entorno:**

- **Desarrollo**: `apps/api/.env.dev` y `apps/web/.env.dev`
- **Producción**: `apps/api/.env.prod` y `apps/web/.env.prod`

**Variables OIDC requeridas** (ver sección de Integración OIDC arriba)

## 🎯 Cómo Usar Este financial-win

### 1. Configuración Inicial

```bash
# Clonar o copiar esta aplicación
git clone <repo-url> financial-win
cd financial-win

# Aplicar Script para cambio de nombre
cd scripts/change-app-name.sh

# Aplicar Script para cambio de puertos
cd scripts/change-ports.sh

# Configurar variables de entorno
cd apps/api
cp .env.example .env.dev

cd apps/web
cp .env.example .env.dev

# Instalar dependencias
pnpm install

# Aplicar Script para lanzar la app
cd scripts/dev.sh

# Aplicar Script para reinstalar dependencias eliminando cache
cd scripts/dev-robust.sh

```

## 🗄️ Base de Datos y Migraciones

### Desarrollo

**IMPORTANTE**: `synchronize` está deshabilitado siempre. Siempre usar migraciones, incluso en desarrollo.

**Producción (manual):**

```bash
# Ver estado de migraciones (qué está aplicado y qué falta)
pnpm migration:prod:status

# Ejecutar solo las migraciones pendientes
pnpm migration:prod

# Verificar conexión a la base de datos
pnpm migration:prod:check

# Revertir última migración (¡CUIDADO!)
pnpm migration:prod:revert
```

#### Scripts Disponibles

| Comando                      | Descripción                                          |
| ---------------------------- | ---------------------------------------------------- |
| `pnpm migration:prod`        | Ejecutar migraciones pendientes                      |
| `pnpm migration:prod:status` | Ver estado de migraciones (aplicadas/pendientes)     |
| `pnpm migration:prod:check`  | Verificar conexión a base de datos                   |
| `pnpm migration:prod:revert` | Revertir última migración                            |
| `pnpm migration:generate`    | Generar migración automática                         |
| `pnpm migration:create`      | Crear migración vacía                                |
| `pnpm migration:dev:reset`   | Reset completo DB local (drop + create + migrations) |
| `pnpm migration:run`         | Ejecutar migraciones pendientes (desarrollo)         |
| `pnpm migration:show`        | Ver estado de migraciones (desarrollo)               |

#### Compatibilidad con Digital Ocean

El sistema está optimizado para Digital Ocean PostgreSQL:

- **SSL habilitado** automáticamente en producción
- **Conexión segura** con `rejectUnauthorized: false`
- **Variables de entorno** compatibles con Digital Ocean
- **Scripts robustos** con validación de entorno

#### Ejecutar desde DigitalOcean Console

Para ejecutar migraciones desde la consola de DigitalOcean:

```bash
# Navegar al directorio de la API
cd apps/api

# Ver estado de migraciones
node scripts/run-migrations-prod.js status

# Ejecutar solo las migraciones pendientes
node scripts/run-migrations-prod.js run

# Verificar conexión
node scripts/run-migrations-prod.js check
```

El script muestra claramente:

- ✅ Migraciones ya aplicadas
- ⏳ Migraciones pendientes
- 📋 Detalles de cada migración con timestamps

## 🔧 Git Hooks con Husky

Esta aplicación incluye Git hooks configurados con Husky para mantener calidad de código automáticamente.

### Hooks Configurados

#### Pre-commit Hook

Se ejecuta automáticamente antes de cada commit y realiza:

1. **Prettier**: Formatea código automáticamente
2. **ESLint**: Detecta y corrige errores de linting
3. **TypeCheck**: Verifica tipos TypeScript (solo si hay archivos TS modificados)
4. **Auditoría de Seguridad Multi-tenant**: Valida uso correcto de `company_id` (solo si hay cambios en `.controller.ts` o `.service.ts`)
   - ✅ Verifica que endpoints tenant-scoped usen `@CompanyId()` decorator
   - ✅ Valida que `companyId` se pase correctamente a servicios
   - ✅ Detecta queries SQL sin filtro de tenant
   - ✅ **Bloquea el commit si encuentra problemas de seguridad**

El commit se bloquea si hay errores que no se pueden corregir automáticamente o si se detectan problemas de seguridad multi-tenant.

## 📚 Documentación

### Guías del financial-win

La documentación completa del financial-win está disponible en los archivos `.mdc`:

- `mdc/00-financial-win-GUIDE.mdc` - Guía de uso del financial-win
- `mdc/01-ARCHITECTURE.mdc` - Arquitectura del sistema
- `mdc/02-OIDC-INTEGRATION.mdc` - Guía de integración OIDC
