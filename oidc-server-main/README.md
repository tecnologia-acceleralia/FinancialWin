# Sistema OIDC Local - Manual de Uso

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose instalados
- Puerto 3008, 4009 y 5009 disponibles
- Puerto 5437 disponible (PostgreSQL)

### Instalación y Ejecución

1. **Clonar el repositorio:**

   ```bash
   git clone <repository-url>
   cd oidc-server
   ```

2. **Configurar variables de entorno:**

   ```bash
   cp env.example .env
   # Editar .env si es necesario
   ```

3. **Levantar el sistema:**

   ```bash
   make up
   # O alternativamente:
   docker compose up --build -d
   ```

4. **Verificar estado:**
   ```bash
   make status
   # O alternativamente:
   docker compose ps
   ```

## 🔧 Servicios del Sistema

### Provider OIDC (Puerto 5009)

- **URL**: http://localhost:5009
- **Función**: Servidor de autenticación OpenID Connect
- **Endpoints principales**:
  - `GET /health` - Health check
  - `GET /.well-known/openid-configuration` - Metadata OIDC
  - `GET /interaction/:uid` - Formulario de login
  - `POST /interaction/:uid/login` - Procesar login
  - `GET /admin-panel/` - Admin Panel (gestión de empresas, clientes y usuarios)
  - `GET /admin/*` - Admin API endpoints
  - `GET /_admin/users` - Listar usuarios (DEV)
  - **`POST /api/token/validate`** - Validación centralizada de tokens para módulos satélites
  - **`GET /api/token/validate`** - Validación de tokens (alternativa GET)
  - **`GET /admin/access/check`** - Verificar acceso empresa-cliente (API interna)

### Backend API (Puerto 4009)

- **URL**: http://localhost:4009
- **Función**: API protegida con autenticación OIDC
- **Endpoints principales**:
  - `GET /health` - Health check
  - `GET /api/info` - Información del servicio
  - `GET /auth/login` - Iniciar proceso de login
  - `GET /auth/callback` - Callback OIDC
  - `GET /auth/logout` - Cerrar sesión
  - `GET /api/me` - Información del usuario autenticado

### Frontend (Puerto 3008)

- **URL**: http://localhost:3008
- **Función**: Interfaz web para probar el sistema
- **Características**:
  - Verificación automática de autenticación
  - Redirección a login si no está autenticado
  - Muestra información del usuario
  - Botón de logout

### Admin Panel (Integrado en Provider)

- **URL**: http://localhost:5009/admin-panel/
- **Función**: Panel de administración para gestión del sistema OIDC
- **Características**:
  - Gestión de empresas y usuarios
  - Gestión de clientes OIDC
  - Control de acceso empresa-cliente
  - Logs de auditoría
  - Estadísticas del sistema
- **Usuarios Admin por defecto**:
  - `admin` / `admin123`
  - `superadmin` / `super123`

## 👥 Usuarios de Prueba

El sistema incluye usuarios de prueba preconfigurados:

| Email             | Password    | Company ID |
| ----------------- | ----------- | ---------- |
| alice@example.com | password123 | COMP-001   |
| bob@example.com   | password456 | COMP-002   |

## 🔄 Flujo de Autenticación

1. **Acceso inicial**: Usuario docker exec -it oidc-db psql -U oidc_user -d oidc_db -c "UPDATE oidc_clients SET redirect_uris = '[\"http://localhost:4009/auth/callback\"]' WHERE client_id = 'writehub-client';"visita http://localhost:3008
2. **Verificación**: Frontend consulta `/api/me` en el backend
3. **Redirección**: Si no está autenticado, redirige a `/auth/login`
4. **Login**: Backend redirige al provider para autenticación
5. **Formulario**: Provider muestra formulario de login
6. **Validación**: Provider valida credenciales contra PostgreSQL
7. **Callback**: Provider redirige de vuelta al backend
8. **Sesión**: Backend crea sesión y redirige al frontend
9. **Datos**: Frontend muestra información del usuario

## 🛠️ Comandos Útiles

### Makefile

```bash
make help          # Mostrar ayuda
make up            # Levantar servicios
make down          # Parar servicios
make logs          # Ver logs en tiempo real
make status        # Estado de servicios
make test          # Tests básicos
make clean         # Limpiar volúmenes y DB
```

### Docker Compose

```bash
docker compose up --build -d    # Levantar servicios
docker compose down             # Parar servicios
docker compose logs -f          # Ver logs
docker compose ps               # Estado de contenedores
docker compose exec provider sh # Acceder al provider
docker compose exec backend sh  # Acceder al backend
```

## 🔍 Testing Manual

### 1. Verificar Servicios

```bash
# Provider
curl http://localhost:5009/health

# Backend
curl http://localhost:4009/health

# Frontend
curl http://localhost:3008/
```

### 2. Probar Autenticación

1. Abrir http://localhost:3008 en el navegador
2. Debería redirigir automáticamente al login
3. Usar credenciales: `alice@example.com` / `password123`
4. Verificar que se muestra la información del usuario
5. Probar logout

### 3. Probar API

```bash
# Sin autenticación (debería devolver 401)
curl http://localhost:4009/api/me

# Con autenticación (usar cookies del navegador)
curl -b cookies.txt http://localhost:4009/api/me
```

### 4. Probar Validación de Tokens (Módulos Satélites)

```bash
# Obtener token de sesión (desde módulo satélite o manualmente)
TOKEN="tu_token_jwt_aqui"

# Validar token (POST)
curl -X POST http://localhost:5009/api/token/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"client_id\": \"writehub-client\"}"

# Validar token (GET)
curl "http://localhost:5009/api/token/validate?token=$TOKEN&client_id=writehub-client"

# Validar token con Authorization header
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5009/api/token/validate?client_id=writehub-client"
```

### 5. Probar Verificación de Acceso

```bash
# Verificar si empresa tiene acceso a cliente
curl "http://localhost:5009/admin/access/check?company_id=COMP-001&client_id=writehub-client"
```

## 🐛 Troubleshooting

### Problemas Comunes

**Servicios no inician:**

```bash
docker compose logs [service-name]
docker compose down && docker compose up --build -d
```

**Base de datos corrupta:**

```bash
make clean
make up
```

**Puertos ocupados:**

```bash
# Verificar puertos en uso
lsof -i :3008
lsof -i :4009
lsof -i :5009

# Cambiar puertos en docker-compose.yml si es necesario
```

**Problemas de permisos:**

```bash
sudo chown -R $USER:$USER .
```

### Logs Útiles

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f provider
docker compose logs -f backend
docker compose logs -f frontend
```

## 🔒 Seguridad

### Configuración de Producción

- Cambiar `SESSION_SECRET` en `.env`
- Usar HTTPS con certificados válidos
- Configurar `TRUST_PROXY=1` si hay reverse proxy
- No exponer endpoints `/_admin/*` en producción
- Implementar rate limiting
- Usar base de datos externa (PostgreSQL)

### Variables de Entorno

**Provider (`provider/.env`):**

```bash
# Desarrollo
NODE_ENV=development
PROVIDER_URL=http://localhost:5009
DATABASE_URL=postgresql://oidc_user:oidc_password_dev@postgres:5437/oidc_db
JWT_SECRET=tu_secreto_compartido_muy_seguro_32chars_minimo  # ⚠️ CRÍTICO: Debe coincidir con módulos satélites
SESSION_SECRET=un_secreto_muy_seguro_para_sesiones
TRUST_PROXY=0

# Producción (ejemplo)
NODE_ENV=production
PROVIDER_URL=https://auth.acceleralia.com
DATABASE_URL=postgresql://user:pass@host:5432/oidc_db
JWT_SECRET=secreto_super_seguro_compartido_produccion  # ⚠️ CRÍTICO
SESSION_SECRET=secreto_super_seguro_de_produccion
TRUST_PROXY=1
```

**Backend (`backend/.env`):**

```bash
# Desarrollo
NODE_ENV=development
OIDC_ISSUER=http://localhost:5009
OIDC_CLIENT_ID=local-client
OIDC_CLIENT_SECRET=local-secret
OIDC_CALLBACK_URL=http://localhost:4009/auth/callback
FRONTEND_URL=http://localhost:3008

# Producción (ejemplo)
NODE_ENV=production
OIDC_ISSUER=https://auth.acceleralia.com
OIDC_CLIENT_ID=acceleralia-client
OIDC_CLIENT_SECRET=secreto_super_seguro_de_produccion
OIDC_CALLBACK_URL=https://api.acceleralia.com/auth/callback
FRONTEND_URL=https://app.acceleralia.com
```

**⚠️ IMPORTANTE: `JWT_SECRET`**

- Debe ser **exactamente el mismo** en oidc-server y todos los módulos satélites
- Mínimo 32 caracteres recomendado
- Sin este secreto, la validación de tokens será menos segura (solo decode)

### Configuración de Cookies

El sistema está configurado para usar cookies con dominio `.acceleralia.com`, lo que permite compartir sesiones entre subdominios:

- ✅ `acceleralia.com`
- ✅ `www.acceleralia.com`
- ✅ `app.acceleralia.com`
- ✅ `api.acceleralia.com`
- ✅ `auth.acceleralia.com`

## 📊 Monitoreo

### Health Checks

- Provider: http://localhost:5009/health
- Backend: http://localhost:4009/health
- Frontend: http://localhost:3008/

### Métricas

```bash
# Estado de contenedores
docker compose ps

# Uso de recursos
docker stats

# Logs estructurados
docker compose logs --timestamps
```

## 🔄 Desarrollo

### Estructura del Proyecto

```
oidc-server/
├── provider/           # Servidor OIDC
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── admin.ts
│   │   │   ├── admin-auth.ts
│   │   │   └── health.ts
│   │   ├── services/
│   │   │   └── database.ts
│   │   └── types.d.ts
│   ├── admin-panel/    # Panel de Administración
│   │   ├── index.html
│   │   ├── admin.js
│   │   └── styles.css
│   ├── package.json
│   └── tsconfig.json
├── backend/           # API Backend
│   ├── src/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/          # Frontend estático
│   ├── index.html
│   └── app.js
├── migrations/        # Database migrations
├── docker-compose.yml
├── Dockerfile.provider
├── Dockerfile.backend
├── Makefile
└── .env
```

### Modo Desarrollo

```bash
# Instalar dependencias localmente
make install-deps

# Ejecutar servicios individualmente
make dev-provider
make dev-backend
```

## 📝 Notas Adicionales

- El sistema usa **PostgreSQL** como base de datos (puerto 5437)
- Los tokens JWT se generan automáticamente por oidc-provider
- Las sesiones se almacenan en cookies httpOnly
- El frontend es completamente estático (HTML+JS)
- El admin panel está integrado en el provider server
- Todos los servicios están containerizados con Docker
- Las migraciones de base de datos se ejecutan automáticamente al iniciar PostgreSQL
- **Rate limiting** implementado (10 intentos/hora por IP/usuario/email/cliente)
- **Control de acceso multi-tenant** mediante `company_client_access`
- **Validación centralizada de tokens** para módulos satélites

## 🔐 Integración con Módulos Satélites

El oidc-server está diseñado para ser el **centro de seguridad** de una arquitectura multi-tenant con módulos satélites.

### Endpoint de Validación de Tokens

**`POST /api/token/validate`** o **`GET /api/token/validate`**

Este endpoint es **crítico** para módulos satélites (como write-mvp). Contiene toda la lógica de seguridad:

**Request:**

```bash
# POST con body
POST /api/token/validate
Content-Type: application/json
{
  "token": "<session_jwt>",
  "client_id": "writehub-client"  # Opcional, para verificar acceso
}

# O GET con query params
GET /api/token/validate?token=<session_jwt>&client_id=writehub-client

# O con Authorization header
GET /api/token/validate?client_id=writehub-client
Authorization: Bearer <session_jwt>
```

**Response (200 OK):**

```json
{
  "valid": true,
  "user": {
    "sub": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "company_id": "COMP-001"
  },
  "expiresAt": 1234567890,
  "expiresAtISO": "2024-01-01T00:00:00.000Z",
  "timeUntilExpiry": 3600
}
```

**Response (401/403):**

```json
{
  "valid": false,
  "error": "Token expired",
  "code": "TOKEN_EXPIRED",
  "access_revoked": false // true si es 403
}
```

### Verificación de Acceso Empresa-Cliente

**`GET /admin/access/check`**

Endpoint interno para verificar si una empresa tiene acceso a un cliente OIDC:

```bash
GET /admin/access/check?company_id=COMP-001&client_id=writehub-client
```

**Response:**

```json
{
  "hasAccess": true,
  "company_id": "COMP-001",
  "client_id": "writehub-client"
}
```

### Configuración Requerida

**Variable `JWT_SECRET`** (CRÍTICA):

El `JWT_SECRET` debe ser **el mismo** en oidc-server y todos los módulos satélites:

```bash
# En oidc-server/provider/.env
JWT_SECRET=tu_secreto_compartido_muy_seguro_32chars_minimo

# En módulos satélites (ej: write-mvp/apps/api/.env.dev)
JWT_SECRET=tu_secreto_compartido_muy_seguro_32chars_minimo
```

**Sin `JWT_SECRET` configurado:**

- ⚠️ La validación de tokens funcionará pero será menos segura (solo decode, sin verificación de firma)
- ⚠️ **NO recomendado para producción**

### Documentación Completa

Para integrar un nuevo módulo satélite, consulta:

- `oidc-ts-mdc/31-SATELLITE-MODULE-INTEGRATION.mdc` - Guía completa de integración

## 🛡️ Rate Limiting

El sistema implementa rate limiting para proteger contra ataques de fuerza bruta:

- **Límite**: 10 intentos por hora
- **Ventana**: 1 hora (se resetea automáticamente)
- **Tipos de identificadores**: IP, usuario, email, cliente
- **Acciones protegidas**: login, token, authorization, userinfo, introspection, revocation, api, admin_login

**Comportamiento:**

- Después de 10 intentos fallidos, el identificador queda bloqueado
- El bloqueo se resetea automáticamente después de 1 hora
- Los intentos se rastrean por combinación de (identificador, tipo, acción)

**Configuración:**

- Habilitado por defecto (`enable_rate_limiting=true` en `system_config`)
- Configurable desde el admin panel
