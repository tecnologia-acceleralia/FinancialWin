# Manual de QA - Gestión de Empresas y Validación de Acceso

## 📋 Información del Sistema

### URLs de Producción

- **OIDC Provider**: `https://auth.test.acceleralia.com`
- **Admin Panel**: `https://auth.test.acceleralia.com/admin-panel/`
- **Write-MVP Frontend**: `https://write.test.acceleralia.com`
- **Write-MVP API**: `https://write.test.acceleralia.com/api`

### Credenciales de Administrador

Para acceder al Admin Panel, se requiere un usuario administrador. Las credenciales deben ser proporcionadas por el administrador del sistema.

**Endpoint de Login Admin**: `POST https://auth.test.acceleralia.com/admin-auth/login`

---

## 🔐 Paso 1: Autenticarse en el Admin Panel

### Objetivo

Obtener una sesión de administrador para realizar operaciones de gestión.

### Pasos

1. **Acceder al Admin Panel**
   - URL: `https://auth.test.acceleralia.com/admin-panel/`
   - Debe mostrar el formulario de login

2. **Realizar Login**
   - Método: `POST`
   - URL: `https://auth.test.acceleralia.com/admin-auth/login`
   - Headers:
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - Body:
     ```json
     {
       "username": "admin",
       "password": "admin123"
     }
     ```

### Casos de Prueba

#### ✅ Caso de Éxito 1: Login Exitoso

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt \
  -v
```

**Resultado Esperado:**

- Status Code: `200 OK`
- Response Body:
  ```json
  {
    "success": true,
    "admin": {
      "id": 1,
      "username": "admin",
      "full_name": "Administrator",
      "email": "admin@example.com",
      "is_super_admin": true
    }
  }
  ```
- Cookie `admin_session` establecida
- Redirección al dashboard del admin panel

#### ❌ Caso de Fallo 1: Credenciales Inválidas

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong_password"}' \
  -v
```

**Resultado Esperado:**

- Status Code: `401 Unauthorized`
- Response Body:
  ```json
  {
    "error": "Invalid credentials"
  }
  ```
- No se establece cookie `admin_session`

#### ❌ Caso de Fallo 2: Usuario Inexistente

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nonexistent","password":"any_password"}' \
  -v
```

**Resultado Esperado:**

- Status Code: `401 Unauthorized`
- Response Body:
  ```json
  {
    "error": "Invalid credentials"
  }
  ```

#### ❌ Caso de Fallo 3: Campos Vacíos

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"","password":""}' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "Username and password are required"
  }
  ```

---

## 🏢 Paso 2: Crear una Nueva Empresa

### Objetivo

Registrar una nueva empresa en el sistema OIDC.

### Endpoint

- **Método**: `POST`
- **URL**: `https://auth.test.acceleralia.com/admin/companies`
- **Autenticación**: Requiere cookie `admin_session` (obtenida en Paso 1)
- **Content-Type**: `application/json`

### Estructura de Datos

**Request Body:**

```json
{
  "company_id": "COMP-TEST-001",
  "company_name": "Empresa de Prueba QA"
}
```

**Validaciones:**

- `company_id`:
  - Requerido
  - Mínimo: 1 carácter
  - Máximo: 100 caracteres
  - Formato: Solo alfanuméricos, guiones bajos y guiones (`/^[a-zA-Z0-9_-]+$/`)
  - Ejemplos válidos: `COMP-001`, `TEST_COMPANY`, `empresa-123`
  - Ejemplos inválidos: `COMP 001` (espacios), `COMP@001` (símbolos), `` (vacío)

- `company_name`:
  - Requerido
  - Mínimo: 1 carácter
  - Máximo: 255 caracteres
  - Puede contener espacios y caracteres especiales

### Casos de Prueba

#### ✅ Caso de Éxito 1: Crear Empresa con Datos Válidos

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/companies \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company_id": "COMP-TEST-001",
    "company_name": "Empresa de Prueba QA"
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `200 OK`
- Response Body:
  ```json
  {
    "id": 1,
    "company_id": "COMP-TEST-001",
    "company_name": "Empresa de Prueba QA",
    "is_active": true,
    "created_at": "2025-10-31T13:00:00.000Z",
    "updated_at": "2025-10-31T13:00:00.000Z"
  }
  ```
- Se registra en `audit_logs` con acción `company_created`
- La empresa aparece en la lista de empresas activas

#### ✅ Caso de Éxito 2: Crear Empresa con company_id en Minúsculas

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/companies \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company_id": "comp-test-002",
    "company_name": "Empresa Minúsculas"
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `200 OK`
- Response Body con `company_id` en minúsculas: `"comp-test-002"`

#### ❌ Caso de Fallo 1: company_id con Espacios

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/companies \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company_id": "COMP TEST 001",
    "company_name": "Empresa de Prueba"
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "company_id can only contain alphanumeric characters, underscores, and hyphens",
    "field": "company_id"
  }
  ```

#### ❌ Caso de Fallo 2: company_id con Símbolos Especiales

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/companies \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company_id": "COMP@001#",
    "company_name": "Empresa de Prueba"
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "company_id can only contain alphanumeric characters, underscores, and hyphens",
    "field": "company_id"
  }
  ```

#### ❌ Caso de Fallo 3: company_id Vacío

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/companies \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company_id": "",
    "company_name": "Empresa de Prueba"
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "company_id is required",
    "field": "company_id"
  }
  ```

#### ❌ Caso de Fallo 4: company_name Vacío

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/companies \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company_id": "COMP-001",
    "company_name": ""
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "company_name is required",
    "field": "company_name"
  }
  ```

#### ❌ Caso de Fallo 5: company_id Duplicado

**Precondición**: Ya existe una empresa con `company_id: "COMP-001"`

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/companies \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company_id": "COMP-001",
    "company_name": "Otra Empresa"
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `500 Internal Server Error` o `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "Failed to create company"
  }
  ```
- Mensaje de error específico indicando duplicado (puede variar según implementación)

#### ❌ Caso de Fallo 6: Sin Autenticación

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/companies \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "COMP-001",
    "company_name": "Empresa de Prueba"
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `401 Unauthorized`
- Response Body:
  ```json
  {
    "error": "Admin session required"
  }
  ```

#### ❌ Caso de Fallo 7: company_id Demasiado Largo

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/companies \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "company_id": "VERY_LONG_COMPANY_ID_THAT_EXCEEDS_THE_MAXIMUM_LENGTH_OF_100_CHARACTERS_AND_SHOULD_BE_REJECTED",
    "company_name": "Empresa de Prueba"
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "company_id must not exceed 100 characters",
    "field": "company_id"
  }
  ```

---

## 👤 Paso 3: Crear Usuario para la Empresa

### Objetivo

Crear un usuario OIDC asociado a una empresa existente.

### Endpoint

- **Método**: `POST`
- **URL**: `https://auth.test.acceleralia.com/admin/users`
- **Autenticación**: Requiere cookie `admin_session`
- **Content-Type**: `application/json`

### Estructura de Datos

**Request Body:**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "Password123!",
  "name": "Nombre Usuario",
  "company_id": 1
}
```

**Validaciones:**

- `email`:
  - Requerido
  - Formato válido de email (RFC 5322)
  - Ejemplos válidos: `usuario@ejemplo.com`, `test.user@domain.co.uk`
  - Ejemplos inválidos: `usuario@`, `@ejemplo.com`, `usuario ejempl@com`

- `password`:
  - Requerido
  - **Cumplir requisitos ENS (Esquema Nacional de Seguridad)**:
    - Mínimo 8 caracteres
    - Al menos una letra mayúscula
    - Al menos una letra minúscula
    - Al menos un dígito
    - Al menos un símbolo especial: `!@#$%^&*(),.?":{}|<>_-+=[]\/;'`~`
  - Ejemplos válidos: `Password123!`, `MiClave#2024`
  - Ejemplos inválidos: `password` (sin mayúscula, sin número, sin símbolo), `PASS123` (sin minúscula, sin símbolo)

- `name`:
  - Requerido
  - Mínimo: 1 carácter
  - Máximo: 255 caracteres

- `company_id`:
  - Requerido
  - Debe ser un entero positivo
  - **La empresa debe existir y estar activa**

### Casos de Prueba

#### ✅ Caso de Éxito 1: Crear Usuario con Datos Válidos

**Precondición**: Existe una empresa con `company_id: 1` y está activa

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "test.user@example.com",
    "password": "Password123!",
    "name": "Usuario de Prueba",
    "company_id": 1
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `200 OK`
- Response Body:
  ```json
  {
    "id": 1,
    "email": "test.user@example.com",
    "name": "Usuario de Prueba",
    "company_id": 1,
    "is_active": true,
    "created_at": "2025-10-31T13:00:00.000Z",
    "updated_at": "2025-10-31T13:00:00.000Z"
  }
  ```
- **Nota**: El password NO aparece en la respuesta (se almacena hasheado)
- Se registra en `audit_logs` con acción `user_created`
- El usuario puede autenticarse con estas credenciales

#### ❌ Caso de Fallo 1: Email Inválido

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "email-invalido",
    "password": "Password123!",
    "name": "Usuario de Prueba",
    "company_id": 1
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "Invalid email address",
    "message": "Please provide a valid email address in the format: user@example.com"
  }
  ```

#### ❌ Caso de Fallo 2: Password Débil (Sin Mayúscula)

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "test.user@example.com",
    "password": "password123!",
    "name": "Usuario de Prueba",
    "company_id": 1
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "Password does not meet security requirements",
    "message": "Password must comply with ENS (Esquema Nacional de Seguridad) requirements",
    "details": ["Password must contain at least one uppercase letter"]
  }
  ```

#### ❌ Caso de Fallo 3: Password Débil (Muy Corto)

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "test.user@example.com",
    "password": "Pass1!",
    "name": "Usuario de Prueba",
    "company_id": 1
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "Password does not meet security requirements",
    "message": "Password must comply with ENS (Esquema Nacional de Seguridad) requirements",
    "details": ["Password must be at least 8 characters long"]
  }
  ```

#### ❌ Caso de Fallo 4: Password Débil (Sin Símbolo Especial)

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "test.user@example.com",
    "password": "Password123",
    "name": "Usuario de Prueba",
    "company_id": 1
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "Password does not meet security requirements",
    "message": "Password must comply with ENS (Esquema Nacional de Seguridad) requirements",
    "details": [
      "Password must contain at least one special symbol (!@#$%^&*(),.?\":{}|<>_-+=[]\\/;'`~)"
    ]
  }
  ```

#### ❌ Caso de Fallo 5: Empresa No Existe

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "test.user@example.com",
    "password": "Password123!",
    "name": "Usuario de Prueba",
    "company_id": 99999
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "Invalid company",
    "message": "Company does not exist or is inactive. Please select a valid company."
  }
  ```

#### ❌ Caso de Fallo 6: Empresa Inactiva

**Precondición**: Existe una empresa con `company_id: 2` pero `is_active: false`

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "test.user@example.com",
    "password": "Password123!",
    "name": "Usuario de Prueba",
    "company_id": 2
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "Invalid company",
    "message": "Company does not exist or is inactive. Please select a valid company."
  }
  ```

#### ❌ Caso de Fallo 7: Email Duplicado

**Precondición**: Ya existe un usuario con `email: "test.user@example.com"`

**Request:**

```bash
curl -X POST https://auth.test.acceleralia.com/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "test.user@example.com",
    "password": "Password123!",
    "name": "Usuario Duplicado",
    "company_id": 1
  }' \
  -v
```

**Resultado Esperado:**

- Status Code: `500 Internal Server Error` o `400 Bad Request`
- Response Body:
  ```json
  {
    "error": "Failed to create user"
  }
  ```
- Mensaje de error específico indicando duplicado (puede variar según implementación)

---

## ✅ Paso 4: Validar Acceso del Usuario

### Objetivo

Verificar que el usuario creado puede autenticarse y acceder a Write-MVP.

### Flujo de Validación

1. **Acceder a Write-MVP sin autenticación**
2. **Ser redirigido al login OIDC**
3. **Ingresar credenciales del usuario**
4. **Ser redirigido de vuelta a Write-MVP**
5. **Acceder a recursos protegidos**

### Casos de Prueba

#### ✅ Caso de Éxito 1: Login Exitoso con Usuario Recién Creado

**Precondición**:

- Empresa creada con `company_id: "COMP-TEST-001"`
- Usuario creado con `email: "test.user@example.com"` y `password: "Password123!"`

**Pasos Manuales:**

1. **Limpiar cookies del navegador** (para empezar sin sesión)
2. **Acceder a**: `https://write.test.acceleralia.com/`
3. **Resultado Esperado**:
   - Redirección automática a: `https://auth.test.acceleralia.com/auth?response_type=code&client_id=write-mvp-client&redirect_uri=...`
   - Se muestra formulario de login OIDC

4. **Ingresar credenciales**:
   - Email: `test.user@example.com`
   - Password: `Password123!`
5. **Click en "Iniciar Sesión"**
6. **Resultado Esperado**:
   - Login exitoso
   - Redirección a: `https://write.test.acceleralia.com/`
   - Acceso a la aplicación Write-MVP
   - Información del usuario visible en la interfaz
   - Botón de logout visible

**Verificación con API:**

```bash
# Verificar información del usuario autenticado
curl -X GET https://write.test.acceleralia.com/api/auth/me \
  -b cookies.txt \
  -v
```

**Resultado Esperado:**

- Status Code: `200 OK`
- Response Body:
  ```json
  {
    "authenticated": true,
    "user": {
      "email": "test.user@example.com",
      "name": "Usuario de Prueba",
      "company_id": "COMP-TEST-001",
      "company_name": "Empresa de Prueba QA"
    }
  }
  ```

#### ✅ Caso de Éxito 2: Acceso a Recursos Protegidos

**Precondición**: Usuario autenticado correctamente

**Request:**

```bash
curl -X GET https://write.test.acceleralia.com/api/projects \
  -H "Authorization: Bearer <token>" \
  -b cookies.txt \
  -v
```

**Resultado Esperado:**

- Status Code: `200 OK`
- Response Body con lista de proyectos (o array vacío si no hay proyectos)

#### ❌ Caso de Fallo 1: Login con Credenciales Incorrectas

**Pasos Manuales:**

1. Acceder a: `https://write.test.acceleralia.com/`
2. Ser redirigido al login OIDC
3. Ingresar credenciales incorrectas:
   - Email: `test.user@example.com`
   - Password: `WrongPassword123!`
4. Click en "Iniciar Sesión"

**Resultado Esperado:**

- Mensaje de error: "Invalid credentials" o similar
- No se completa el login
- Permanece en la página de login

#### ❌ Caso de Fallo 2: Usuario Inactivo

**Precondición**: Usuario existe pero `is_active: false`

**Pasos Manuales:**

1. Acceder a: `https://write.test.acceleralia.com/`
2. Ser redirigido al login OIDC
3. Ingresar credenciales del usuario inactivo
4. Click en "Iniciar Sesión"

**Resultado Esperado:**

- Mensaje de error indicando que el usuario está inactivo
- No se completa el login
- Permanece en la página de login

#### ❌ Caso de Fallo 3: Acceso Sin Autenticación

**Request:**

```bash
curl -X GET https://write.test.acceleralia.com/api/projects \
  -v
```

**Resultado Esperado:**

- Status Code: `401 Unauthorized`
- Response Body:
  ```json
  {
    "error": "Authentication required"
  }
  ```
- El interceptor del frontend debería redirigir automáticamente a `/auth/login`

---

## 📊 Paso 5: Verificar Empresa y Usuarios Creados

### Objetivo

Confirmar que la empresa y los usuarios están registrados correctamente en el sistema.

### Endpoints de Verificación

#### 1. Listar Todas las Empresas

**Endpoint**: `GET https://auth.test.acceleralia.com/admin/companies`

**Request:**

```bash
curl -X GET https://auth.test.acceleralia.com/admin/companies \
  -b cookies.txt \
  -v
```

**Resultado Esperado:**

- Status Code: `200 OK`
- Response Body: Array de empresas
  ```json
  [
    {
      "id": 1,
      "company_id": "COMP-TEST-001",
      "company_name": "Empresa de Prueba QA",
      "is_active": true,
      "created_at": "2025-10-31T13:00:00.000Z",
      "updated_at": "2025-10-31T13:00:00.000Z"
    }
  ]
  ```

#### 2. Obtener Usuarios de una Empresa

**Endpoint**: `GET https://auth.test.acceleralia.com/admin/companies/:id/users`

**Request:**

```bash
curl -X GET https://auth.test.acceleralia.com/admin/companies/1/users \
  -b cookies.txt \
  -v
```

**Resultado Esperado:**

- Status Code: `200 OK`
- Response Body: Array de usuarios de la empresa
  ```json
  [
    {
      "id": 1,
      "email": "test.user@example.com",
      "name": "Usuario de Prueba",
      "company_id": 1,
      "is_active": true,
      "created_at": "2025-10-31T13:00:00.000Z",
      "updated_at": "2025-10-31T13:00:00.000Z"
    }
  ]
  ```

#### 3. Validar Existencia de Empresa

**Endpoint**: `GET https://auth.test.acceleralia.com/admin/companies/:id/validate`

**Request:**

```bash
curl -X GET https://auth.test.acceleralia.com/admin/companies/1/validate \
  -b cookies.txt \
  -v
```

**Resultado Esperado:**

- Status Code: `200 OK`
- Response Body:
  ```json
  {
    "valid": true
  }
  ```

---

## 🔄 Flujo Completo de Prueba

### Escenario: Nueva Empresa con Usuario

1. ✅ **Login Admin**: Autenticarse en el Admin Panel
2. ✅ **Crear Empresa**: `POST /admin/companies` con datos válidos
3. ✅ **Verificar Empresa**: `GET /admin/companies` para confirmar creación
4. ✅ **Crear Usuario**: `POST /admin/users` asociado a la empresa
5. ✅ **Verificar Usuario**: `GET /admin/companies/:id/users` para confirmar creación
6. ✅ **Logout Admin**: Cerrar sesión del admin panel
7. ✅ **Login Usuario**: Acceder a Write-MVP con credenciales del usuario
8. ✅ **Verificar Acceso**: Confirmar que puede acceder a recursos protegidos

---

## 📝 Notas Importantes

1. **Autenticación**: Todas las operaciones del Admin Panel requieren cookie `admin_session`
2. **Auditoría**: Todas las operaciones se registran en `audit_logs`
3. **Validaciones**: El sistema valida todos los campos antes de crear/actualizar
4. **Seguridad**: Las contraseñas se almacenan hasheadas (bcrypt)
5. **Soft Delete**: Los usuarios se desactivan, no se eliminan físicamente
6. **Relaciones**: Los usuarios deben estar asociados a empresas activas

---

## 🐛 Troubleshooting

### Error: "Admin session required"

- **Causa**: Cookie `admin_session` no presente o expirada
- **Solución**: Realizar login nuevamente en el Admin Panel

### Error: "Company does not exist or is inactive"

- **Causa**: La empresa no existe o `is_active: false`
- **Solución**: Verificar que la empresa existe y está activa usando `GET /admin/companies`

### Error: "Password does not meet security requirements"

- **Causa**: La contraseña no cumple requisitos ENS
- **Solución**: Usar contraseña con al menos 8 caracteres, mayúscula, minúscula, número y símbolo especial

### Error: "Invalid email address"

- **Causa**: Formato de email inválido
- **Solución**: Usar formato válido: `usuario@dominio.com`

---

## 📞 Contacto

Para problemas o preguntas sobre este manual, contactar al equipo de desarrollo.
