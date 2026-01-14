# Plan de Consolidación de Documentación - Variables de Entorno y Troubleshooting

## Análisis de Documentación Actual

### Documentos Técnicos Existentes (`/oidc-ts-mdc/`)

#### Variables de Entorno:
- **`02-env.mdc`**: Muy básico, solo menciona variables de desarrollo (raíz)
- **`20-ENV-PROVIDER-PRODUCCION.mdc`**: Variables de producción para Provider
- **`21-ENV-BACKEND-PRODUCCION.mdc`**: Variables de producción para Backend
- **`22-ENV-INDEX-PRODUCCION.mdc`**: Índice de variables de producción
- **`31-Plan-de-Verificación-de-Variables.mdc`**: Plan de verificación (similar a nuevos documentos)

#### Troubleshooting:
- **`13-troubleshooting.mdc`**: Muy básico, solo tips generales

#### Setup:
- **`24-OIDC-SERVER-SETUP.mdc`**: Setup del servidor y creación de clientes

### Documentos Nuevos (Raíz `/`)

- **`ENV_SETUP_GUIDE.md`**: Guía completa de configuración para desarrollo local
- **`ENV_QUICK_REFERENCE.md`**: Referencia rápida de variables
- **`SOLUCION_INVALID_REDIRECT_URI.md`**: Solución específica para error común

---

## Propuesta de Consolidación

### 1. Actualizar `02-env.mdc` - Variables de Entorno (Desarrollo)

**Objetivo**: Convertir este documento básico en una guía completa de desarrollo local.

**Contenido a Incorporar de `ENV_SETUP_GUIDE.md`**:
- Estructura completa de archivos `.env` por servicio
- Variables requeridas y opcionales
- Ejemplos de valores para desarrollo local
- Validaciones y consistencia entre archivos
- Integración con Write-mvp

**Estructura Propuesta**:
```
# Title
Variables de Entorno - Desarrollo Local

# Summary
Guía completa para configurar variables de entorno en desarrollo local,
incluyendo configuración de oidc-server y write-mvp para integración OIDC.

# Prerequisites
- Docker Desktop instalado y corriendo
- PostgreSQL accesible
- Node.js 18+ instalado

# TechnicalDetails
## 1. Provider OIDC (provider/.env)
[Contenido detallado de ENV_SETUP_GUIDE.md]

## 2. Backend OIDC (backend/.env)
[Contenido detallado de ENV_SETUP_GUIDE.md]

## 3. Write-mvp API (apps/api/.env.dev)
[Contenido detallado de ENV_SETUP_GUIDE.md]

## 4. Write-mvp Web (apps/web/.env.dev)
[Contenido detallado de ENV_SETUP_GUIDE.md]

## 5. Validaciones Críticas
- Consistencia de credenciales OIDC
- Consistencia de URLs
- URLs de redirect

## 6. Registro del Cliente OIDC
- Opción 1: Admin Panel
- Opción 2: Base de datos directa

## 7. Verificación
- Script automatizado
- Verificación manual
```

**Referencias**:
- Mantener referencia a `20-ENV-PROVIDER-PRODUCCION.mdc` y `21-ENV-BACKEND-PRODUCCION.mdc` para producción
- Vincular con `31-Plan-de-Verificación-de-Variables.mdc` si se mantiene como plan de verificación

---

### 2. Actualizar `13-troubleshooting.mdc` - Troubleshooting

**Objetivo**: Expandir el documento básico con soluciones específicas y detalladas.

**Contenido a Incorporar de `SOLUCION_INVALID_REDIRECT_URI.md`**:
- Error `invalid_redirect_uri` con solución paso a paso
- Verificación de configuración del backend
- Registro/actualización de cliente OIDC
- Verificación de consistencia
- Troubleshooting adicional

**Estructura Propuesta**:
```
# Title
Troubleshooting - Problemas Comunes y Soluciones

# Summary
Guía completa de troubleshooting para problemas comunes en el servidor OIDC,
incluyendo errores de configuración, problemas de integración y soluciones paso a paso.

# TechnicalDetails
## 1. Error: invalid_redirect_uri
[Contenido completo de SOLUCION_INVALID_REDIRECT_URI.md]

## 2. Problemas de Configuración de Variables
- Variables faltantes
- Credenciales que no coinciden
- URLs incorrectas

## 3. Problemas de Base de Datos
- Cliente OIDC no existe
- Cliente inactivo
- redirect_uris incorrectos

## 4. Problemas de Sesión y Autenticación
- Loop de login
- 401 en `/api/me`
- Cookie de sesión inválida

## 5. Problemas de Red y Conectividad
- 404 en provider
- Conexión a base de datos fallida
- CORS y credentials

## 6. Verificación Rápida
[Checklist y comandos útiles]
```

---

### 3. Consolidar `31-Plan-de-Verificación-de-Variables.mdc`

**Opción A**: Actualizar con contenido de `ENV_SETUP_GUIDE.md` y mantener como "Plan de Verificación"
**Opción B**: Eliminar y consolidar todo en `02-env.mdc` (recomendado)

**Recomendación**: **Opción B** - Eliminar `31-Plan-de-Verificación-de-Variables.mdc` después de consolidar su contenido útil en `02-env.mdc`.

**Razón**: `31-Plan-de-Verificación-de-Variables.mdc` es esencialmente un plan de trabajo, mientras que `ENV_SETUP_GUIDE.md` es la implementación completa. La información útil del plan puede incorporarse en `02-env.mdc` como sección de "Verificación".

---

### 4. Crear Referencia Rápida Consolidada

**Opción A**: Actualizar `22-ENV-INDEX-PRODUCCION.mdc` para incluir también desarrollo
**Opción B**: Crear nuevo documento `32-ENV-QUICK-REFERENCE.mdc` basado en `ENV_QUICK_REFERENCE.md`

**Recomendación**: **Opción B** - Crear `32-ENV-QUICK-REFERENCE.mdc` con:
- Tabla de variables por servicio (desarrollo y producción)
- Comandos útiles
- Validaciones críticas
- Referencias a documentos detallados

**Estructura**:
```
# Title
Referencia Rápida de Variables de Entorno

# Summary
Referencia rápida de todas las variables de entorno necesarias para
desarrollo local y producción, con valores de ejemplo y validaciones críticas.

# TechnicalDetails
## Tabla de Variables por Servicio
[Tabla consolidada de ENV_QUICK_REFERENCE.md]

## Comandos Útiles
- Verificación de configuración
- Creación de archivos desde ejemplos
- Verificación de cliente OIDC

## Validaciones Críticas
- Consistencia de credenciales
- Consistencia de URLs
- URLs de redirect

## Referencias
- Desarrollo Local: [02-env.mdc]
- Producción Provider: [20-ENV-PROVIDER-PRODUCCION.mdc]
- Producción Backend: [21-ENV-BACKEND-PRODUCCION.mdc]
- Troubleshooting: [13-troubleshooting.mdc]
```

---

## Plan de Acción

### Fase 1: Actualización de Documentos Técnicos
1. ✅ Actualizar `02-env.mdc` con contenido completo de `ENV_SETUP_GUIDE.md`
2. ✅ Actualizar `13-troubleshooting.mdc` con contenido de `SOLUCION_INVALID_REDIRECT_URI.md`
3. ✅ Crear `32-ENV-QUICK-REFERENCE.mdc` basado en `ENV_QUICK_REFERENCE.md`

### Fase 2: Consolidación y Limpieza
4. ✅ Incorporar contenido útil de `31-Plan-de-Verificación-de-Variables.mdc` en `02-env.mdc`
5. ✅ Eliminar `31-Plan-de-Verificación-de-Variables.mdc` (redundante)
6. ✅ Archivar o eliminar documentos `.md` de la raíz después de consolidar

### Fase 3: Actualización de Referencias
7. ✅ Actualizar referencias cruzadas entre documentos
8. ✅ Actualizar `24-OIDC-SERVER-SETUP.mdc` para referenciar `02-env.mdc` y `13-troubleshooting.mdc`
9. ✅ Actualizar `README.md` principal si existe

---

## Beneficios de la Consolidación

1. **Eliminación de Redundancia**: Un solo lugar para cada tipo de información
2. **Mejor Organización**: Documentos técnicos en `/oidc-ts-mdc/`, documentación operativa en raíz
3. **Facilidad de Mantenimiento**: Un solo documento para actualizar en lugar de múltiples
4. **Mejor Navegación**: Referencias cruzadas claras entre documentos relacionados
5. **Consistencia**: Formato uniforme usando `.mdc` para documentación técnica

---

## Estructura Final Propuesta

```
/oidc-ts-mdc/
├── 02-env.mdc                    [ACTUALIZADO] Desarrollo local completo
├── 13-troubleshooting.mdc       [ACTUALIZADO] Troubleshooting completo
├── 20-ENV-PROVIDER-PRODUCCION.mdc [EXISTENTE] Producción Provider
├── 21-ENV-BACKEND-PRODUCCION.mdc [EXISTENTE] Producción Backend
├── 22-ENV-INDEX-PRODUCCION.mdc   [EXISTENTE] Índice Producción
├── 24-OIDC-SERVER-SETUP.mdc      [EXISTENTE] Setup del servidor
├── 32-ENV-QUICK-REFERENCE.mdc    [NUEVO] Referencia rápida consolidada
└── ... (otros documentos)

/ (raíz)
├── README.md                     [EXISTENTE] Documentación principal
└── ... (otros archivos de configuración)
```

**Documentos a Eliminar/Archivar**:
- `ENV_SETUP_GUIDE.md` → Consolidado en `02-env.mdc`
- `ENV_QUICK_REFERENCE.md` → Consolidado en `32-ENV-QUICK-REFERENCE.mdc`
- `SOLUCION_INVALID_REDIRECT_URI.md` → Consolidado en `13-troubleshooting.mdc`
- `31-Plan-de-Verificación-de-Variables.mdc` → Consolidado en `02-env.mdc`

---

## Notas Importantes

1. **Preservar URLs y Referencias**: Mantener todas las URLs y referencias específicas de los documentos originales
2. **Formato .mdc**: Los documentos técnicos deben mantener el formato `.mdc` con estructura estándar
3. **Backward Compatibility**: Si hay referencias externas a los `.md`, considerar crear redirects o mantener una versión mínima
4. **Versionado**: Considerar agregar fecha de última actualización en cada documento consolidado

