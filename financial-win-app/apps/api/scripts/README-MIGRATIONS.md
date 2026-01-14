# Scripts de Gestión de Migraciones

Este directorio contiene scripts para gestionar migraciones de base de datos en producción.

## Script Principal: `run-migrations-prod.js`

Script ejecutable para gestionar migraciones desde la consola de DigitalOcean o cualquier entorno de producción.

### Características

- ✅ **Ver estado de migraciones**: Muestra cuáles están aplicadas y cuáles están pendientes
- ✅ **Ejecutar solo pendientes**: Ejecuta únicamente las migraciones que faltan aplicar
- ✅ **Verificar conexión**: Valida la conexión a la base de datos antes de ejecutar
- ✅ **Output claro**: Muestra información detallada con colores para fácil lectura
- ✅ **Manejo de errores**: Manejo robusto de errores con mensajes claros

### Uso

#### Desde DigitalOcean Console

```bash
# Navegar al directorio de la API
cd apps/api

# Ver estado de migraciones (qué está aplicado y qué falta)
node scripts/run-migrations-prod.js status

# Ejecutar solo las migraciones pendientes
node scripts/run-migrations-prod.js run

# Verificar conexión a la base de datos
node scripts/run-migrations-prod.js check
```

#### Desde npm/pnpm scripts

```bash
# Ver estado
pnpm migration:prod:status

# Ejecutar migraciones pendientes
pnpm migration:prod

# Verificar conexión
pnpm migration:prod:check
```

### Requisitos

1. **Variables de entorno configuradas**:
   - `DATABASE_URL`: URL de conexión a PostgreSQL
   - `NODE_ENV`: Debe estar en `production` para producción

2. **Build compilado**:
   - Las migraciones deben estar compiladas en `dist/migrations/`
   - Ejecutar `pnpm build` antes de usar el script en producción

### Ejemplo de Output

#### Estado de Migraciones

```
============================================================
📊 ESTADO DE MIGRACIONES
============================================================

Total de migraciones: 5
✅ Aplicadas: 3
⏳ Pendientes: 2

📋 Migraciones Aplicadas:
   1. 1234567890123-CreateUsersTable
      📅 2024-01-15 10:30:00
   2. 1234567890124-CreatePostsTable
      📅 2024-01-16 14:20:00
   3. 1234567890125-AddIndexToUsers
      📅 2024-01-17 09:15:00

⏳ Migraciones Pendientes:
   1. 1234567890126-AddEmailToUsers
      📅 2024-01-18 11:00:00
   2. 1234567890127-CreateCommentsTable
      📅 2024-01-19 15:45:00

============================================================
```

#### Ejecución de Migraciones

```
📋 Migraciones que se ejecutarán:
   1. 1234567890126-AddEmailToUsers
   2. 1234567890127-CreateCommentsTable

ℹ️  Ejecutando migraciones...
✅ Se ejecutaron 2 migración(es):
   1. 1234567890126-AddEmailToUsers
   2. 1234567890127-CreateCommentsTable
```

### Troubleshooting

#### Error: "DATABASE_URL no está configurado"

**Solución**: Asegúrate de que las variables de entorno estén configuradas en DigitalOcean:
- Ve a tu App → Settings → App-Level Environment Variables
- Agrega `DATABASE_URL` con tu conexión PostgreSQL

#### Error: "Directorio de migraciones no encontrado"

**Solución**: Asegúrate de haber compilado el proyecto:
```bash
cd apps/api
pnpm build
```

#### Error de conexión SSL

El script detecta automáticamente si se requiere SSL (DigitalOcean siempre lo requiere) y configura `rejectUnauthorized: false` para certificados auto-firmados.

### Integración con DigitalOcean Jobs

Puedes configurar un Job en DigitalOcean para ejecutar migraciones automáticamente:

```yaml
# app.yaml
jobs:
  - name: run-migrations
    github:
      repo: tu-repo/tu-proyecto
      branch: main
    run_command: cd apps/api && node scripts/run-migrations-prod.js run
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
```

### Notas Importantes

1. **Siempre verifica el estado antes de ejecutar**: Usa `status` para ver qué migraciones se aplicarán
2. **Backup antes de migraciones críticas**: Aunque el script es seguro, siempre haz backup de producción antes de migraciones importantes
3. **Una migración a la vez**: El script ejecuta todas las pendientes en orden, pero es mejor revisar cada una antes
4. **Reversión**: Si necesitas revertir una migración, usa `pnpm migration:prod:revert`

