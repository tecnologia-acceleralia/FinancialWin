#!/bin/bash
# Script de inicialización genérico para PostgreSQL
# Este script crea el usuario y la base de datos si no existen
# Funciona con cualquier nombre de aplicación
# Se ejecuta automáticamente cuando PostgreSQL se inicializa por primera vez

# NO usar set -e aquí porque queremos manejar errores manualmente
set +e

# Obtener variables de entorno (establecidas por docker-compose)
# Extraer nombre del usuario desde POSTGRES_DB (ej: van_dev -> van)
POSTGRES_DB="${POSTGRES_DB:-financial-win_dev}"
if [[ "$POSTGRES_DB" == *_dev ]]; then
    APP_USER="${POSTGRES_DB%_dev}"
else
    # Si no termina en _dev, usar el nombre completo o un valor por defecto
    APP_USER="${POSTGRES_DB%_prod}"
    if [ "$APP_USER" = "$POSTGRES_DB" ]; then
        APP_USER="app_user"
    fi
fi
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-${APP_USER}}"

# Usar APP_USER como el usuario de la aplicación
# PostgreSQL siempre inicializa con 'postgres', así que ese es el usuario base
POSTGRES_USER="$APP_USER"

echo "=========================================="
echo "Iniciando script de inicialización PostgreSQL"
echo "Usuario de aplicación: $APP_USER"
echo "Base de datos: $POSTGRES_DB"
echo "Contraseña: [configurada]"
echo "=========================================="

# Esperar a que PostgreSQL esté completamente listo
echo "Esperando a que PostgreSQL esté listo..."
RETRIES=30
until pg_isready -U postgres -q || [ $RETRIES -eq 0 ]; do
  echo "  Intento $RETRIES: Esperando a PostgreSQL..."
  sleep 1
  RETRIES=$((RETRIES-1))
done

if [ $RETRIES -eq 0 ]; then
  echo "❌ ERROR: PostgreSQL no está disponible después de 30 intentos"
  exit 1
fi

echo "✓ PostgreSQL está listo"

# Crear usuario de aplicación (siempre crear, excepto si es 'postgres')
if [ -n "$APP_USER" ] && [ "$APP_USER" != "postgres" ]; then
  echo "Creando usuario de aplicación: $APP_USER"
  psql -v ON_ERROR_STOP=0 --username "postgres" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$APP_USER') THEN
            CREATE ROLE "$APP_USER" WITH LOGIN PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Usuario $APP_USER creado exitosamente';
        ELSE
            RAISE NOTICE 'Usuario $APP_USER ya existe';
            -- Actualizar contraseña por si acaso
            ALTER ROLE "$APP_USER" WITH PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Contraseña del usuario $APP_USER actualizada';
        END IF;
    END
    \$\$;
EOSQL
  
  if [ $? -eq 0 ]; then
    echo "✓ Usuario '$APP_USER' verificado/creado"
  else
    echo "⚠️  Advertencia: Hubo un problema al crear/actualizar el usuario '$APP_USER'"
  fi
else
  echo "⚠️  Advertencia: No se pudo determinar el nombre del usuario de aplicación"
  APP_USER="postgres"
fi

# Crear base de datos si no existe
echo "Verificando base de datos: $POSTGRES_DB"
psql -v ON_ERROR_STOP=0 --username "postgres" <<-EOSQL
    SELECT 'CREATE DATABASE "$POSTGRES_DB" OWNER "$APP_USER"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$POSTGRES_DB')\gexec
EOSQL

if [ $? -eq 0 ]; then
  echo "✓ Base de datos '$POSTGRES_DB' verificada/creada"
else
  echo "⚠️  Advertencia: Hubo un problema al crear la base de datos '$POSTGRES_DB'"
fi

# Otorgar privilegios
echo "Otorgando privilegios..."
psql -v ON_ERROR_STOP=0 --username "postgres" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE "$POSTGRES_DB" TO "$APP_USER";
EOSQL

if [ $? -eq 0 ]; then
  echo "✓ Privilegios otorgados"
else
  echo "⚠️  Advertencia: Hubo un problema al otorgar privilegios"
fi

# Verificar que el usuario puede conectarse
echo "Verificando conexión del usuario..."
if psql -U "$APP_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✓ Usuario '$APP_USER' puede conectarse a la base de datos '$POSTGRES_DB'"
else
  echo "⚠️  Advertencia: El usuario '$APP_USER' no pudo conectarse a '$POSTGRES_DB'"
fi

echo "=========================================="
echo "✅ Inicialización completada"
echo "   Usuario de aplicación: $APP_USER"
echo "   Base de datos: $POSTGRES_DB"
echo "=========================================="

