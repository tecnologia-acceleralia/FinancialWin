# Análisis de Validación: Configuración de Refresh Token (offline_access)

**Fecha**: 2025-01-27  
**Objetivo**: Validar que el proyecto financial-win contempla la configuración necesaria para solicitar y usar `refresh_token` mediante el scope `offline_access`.

---

## 📋 Resumen Ejecutivo

### ✅ Aspectos Implementados Correctamente

1. **Infraestructura de Refresh Token**
   - ✅ Endpoint `/auth/refresh` implementado correctamente
   - ✅ Método `refreshTokens()` en `OIDCService` con `grant_type=refresh_token`
   - ✅ Persistencia de `refresh_token` en el JWT de sesión interno
   - ✅ Rotación de tokens durante el refresh
   - ✅ Validación de `company_id` durante el refresh

2. **Configuración de Variables de Entorno**
   - ✅ Soporte para `OIDC_SCOPES` en configuración
   - ✅ Soporte para `OIDC_TOKEN_REFRESH_WINDOW` (ventana de refresh)
   - ✅ Todas las variables requeridas están documentadas

3. **Seguridad**
   - ✅ Validación de token antes de refresh
   - ✅ Verificación de acceso de empresa-cliente
   - ✅ Fail-closed cuando el servicio de validación no está disponible
   - ✅ Cookies httpOnly y configuración segura

### ⚠️ Problemas Identificados

1. **CRÍTICO**: Documentación de ejemplo NO incluye `offline_access`
   - `mdc/02-OIDC-INTEGRATION.mdc` muestra: `OIDC_SCOPES="openid profile email"`
   - `README.md` muestra: `OIDC_SCOPES="openid profile email"`
   - **Impacto**: Los desarrolladores pueden configurar el proyecto sin `offline_access`, lo que impedirá recibir `refresh_token`

2. **Falta de Validación en Código**
   - No hay validación que verifique que `offline_access` esté presente en `OIDC_SCOPES`
   - No hay advertencias o logs que indiquen si el `refresh_token` fue recibido durante el callback
   - **Impacto**: Errores silenciosos si el scope no está configurado

3. **Falta de Logging de Refresh Token**
   - El callback no loguea si recibió `refresh_token` (solo verifica presencia de `access_token` e `id_token`)
   - **Impacto**: Dificulta el diagnóstico cuando el refresh_token no llega

---

## 🔍 Análisis Detallado

### 1. Configuración de Scopes

**Ubicación**: `apps/api/src/common/config/oidc.config.ts`

```29:29:apps/api/src/common/config/oidc.config.ts
    scopes: process.env.OIDC_SCOPES,
```

**Estado**: ✅ La configuración lee `OIDC_SCOPES` correctamente, pero:
- ❌ No valida que contenga `offline_access`
- ❌ No emite advertencias si falta

**Uso en código**: `apps/api/src/common/services/oidc.service.ts`

```75:79:apps/api/src/common/services/oidc.service.ts
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
```

El scope se envía directamente al provider sin validación previa.

### 2. Manejo de Refresh Token en Callback

**Ubicación**: `apps/api/src/auth/auth.controller.ts`

```198:206:apps/api/src/auth/auth.controller.ts
      const sessionToken = this.jwtService.sign({
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        company_id: userInfo.company_id,
        id_token: tokenSet.id_token,
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token,
      });
```

**Estado**: ✅ El `refresh_token` se persiste en el JWT de sesión, pero:
- ❌ No hay log que confirme si `refresh_token` está presente
- ❌ No hay validación que verifique su presencia antes de persistirlo

**Logs actuales**:
```115:120:apps/api/src/common/services/oidc.service.ts
      this.logger.log('✅ Token exchange successful');
      this.logger.log(
        `   Has access_token: ${!!tokenResponse.data.access_token}`
      );
      this.logger.log(`   Has id_token: ${!!tokenResponse.data.id_token}`);
      return tokenResponse.data as TokenSet;
```

**Falta**: Log para `refresh_token`

### 3. Endpoint de Refresh

**Ubicación**: `apps/api/src/auth/auth.controller.ts` (línea 353)

**Estado**: ✅ Implementación completa y correcta:
- ✅ Valida token antes de refresh
- ✅ Verifica que `refresh_token` esté presente en el payload
- ✅ Llama a `oidcService.refreshTokens()` con `grant_type=refresh_token`
- ✅ Valida `company_id` no cambió
- ✅ Verifica acceso empresa-cliente
- ✅ Rota el `refresh_token` si el provider lo proporciona

**Código relevante**:
```510:521:apps/api/src/auth/auth.controller.ts
      // CRITICAL: Re-fetch user info from OIDC provider to validate company_id hasn't changed
      if (!currentPayload.refresh_token) {
        this.logger.error(
          '❌ Refresh failed - No refresh_token in current token'
        );
        return res.status(401).json({ error: 'Refresh token not available' });
      }

      // Refresh tokens from OIDC provider
      this.logger.log('🔐 Refreshing tokens from OIDC provider...');
      const tokenSet = await this.oidcService.refreshTokens(
        currentPayload.refresh_token
      );
```

### 4. Documentación

#### ✅ Documentación Correcta
- `mdc/04-REFRESH_TOKEN-OFFLINE-ACCESS.mdc`: ✅ Especifica claramente que `offline_access` es requerido

#### ❌ Documentación Incorrecta/Incompleta
- `mdc/02-OIDC-INTEGRATION.mdc` (línea 21): Muestra ejemplo sin `offline_access`
- `README.md` (línea 260): Muestra ejemplo sin `offline_access`

**Ejemplo problemático**:
```bash
OIDC_SCOPES="openid profile email"  # ❌ Falta offline_access
```

**Debería ser**:
```bash
OIDC_SCOPES="openid email profile offline_access"  # ✅ Correcto
```

---

## 🎯 Recomendaciones

### Prioridad ALTA (Crítico)

1. **Actualizar Documentación de Ejemplo**
   - Actualizar `mdc/02-OIDC-INTEGRATION.mdc` para incluir `offline_access`
   - Actualizar `README.md` para incluir `offline_access`
   - Agregar comentario explicativo sobre la importancia de `offline_access`

2. **Agregar Validación de Scope**
   - Validar en `onModuleInit()` de `OIDCService` que `OIDC_SCOPES` contenga `offline_access`
   - Emitir advertencia o error si falta

3. **Mejorar Logging**
   - Agregar log en `handleCallback()` que confirme si `refresh_token` fue recibido
   - Agregar log en `callback()` del controller que indique si `refresh_token` está presente

### Prioridad MEDIA

4. **Validación Opcional en Runtime**
   - Validar en el callback si `refresh_token` está presente y emitir advertencia si falta
   - Esto ayudaría a detectar problemas de configuración temprano

5. **Documentación de Troubleshooting**
   - Agregar sección en `02-OIDC-INTEGRATION.mdc` sobre problemas comunes con refresh tokens
   - Incluir diagnóstico para "No llega refresh_token"

---

## ✅ Checklist de Cumplimiento

Basado en `mdc/04-REFRESH_TOKEN-OFFLINE-ACCESS.mdc`:

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Solicita `offline_access` en flujo OIDC | ⚠️ **Parcial** | Configurable pero no validado |
| Recibe y persiste `refresh_token` | ✅ **OK** | Implementado correctamente |
| Renueva sesión con `grant_type=refresh_token` | ✅ **OK** | Endpoint `/auth/refresh` funcional |
| Cookies httpOnly y seguras | ✅ **OK** | Configuración correcta |
| Validación server-side | ✅ **OK** | Validación completa implementada |
| Control de acceso por empresa | ✅ **OK** | Verificación en refresh |
| Variables de entorno documentadas | ⚠️ **Parcial** | Documentadas pero ejemplos incorrectos |
| Validación de configuración | ❌ **Falta** | No valida presencia de `offline_access` |

---

## 📝 Conclusión

El proyecto financial-win **SÍ contempla la infraestructura necesaria** para solicitar y usar `refresh_token`, pero tiene **deficiencias en la configuración y validación** que pueden llevar a errores silenciosos:

1. ✅ **Implementación**: Correcta y completa
2. ⚠️ **Configuración**: Funcional pero sin validación
3. ❌ **Documentación**: Ejemplos incorrectos que pueden confundir a desarrolladores

**Recomendación final**: El financial-win está **funcionalmente completo** pero requiere mejoras en validación y documentación para prevenir errores de configuración comunes.

---

## 🔧 Acciones Sugeridas

1. Actualizar ejemplos de configuración en documentación
2. Agregar validación de `offline_access` en `OIDCService.onModuleInit()`
3. Mejorar logging para detectar problemas con refresh_token
4. Agregar sección de troubleshooting específica para refresh tokens

