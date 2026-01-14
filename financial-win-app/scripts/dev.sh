#!/bin/bash

# Development Setup Script (ROBUST VERSION)
# This script sets up the development environment with automatic cleanup

set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

# Cargar configuración de la aplicación
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/lib/app-config.sh" ]; then
    source "${SCRIPT_DIR}/lib/app-config.sh"
    if load_app_config; then
        # Configuración cargada exitosamente
        :
    else
        # Si falla load_app_config, intentar get_app_name como fallback
        APP_NAME=$(get_app_name 2>/dev/null || echo "financial-win")
    fi
else
    # Fallback: detectar nombre desde docker-compose o .app-config directamente
    if [ -f ".app-config" ]; then
        source .app-config 2>/dev/null
        APP_NAME="${APP_NAME:-financial-win}"
    elif [ -f "docker-compose.dev.yml" ]; then
        APP_NAME=$(grep "container_name:" docker-compose.dev.yml 2>/dev/null | head -1 | sed 's/.*container_name: *\([^-]*\)-.*/\1/' | tr -d ' ' || echo "financial-win")
    else
        APP_NAME="financial-win"
    fi
fi

echo "🚀 Setting up ${APP_NAME} Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# ROBUST CLEANUP: Always clean before starting
print_step "Cleaning existing development environment..."
docker-compose -f docker-compose.dev.yml down --remove-orphans

print_status "Starting PostgreSQL database..."
docker-compose -f docker-compose.dev.yml up -d postgres

print_status "Waiting for PostgreSQL to be ready..."
sleep 10

# Obtener nombre del contenedor PostgreSQL dinámicamente
POSTGRES_CONTAINER="${APP_NAME}-postgres-dev"

# Check if PostgreSQL is ready (usar usuario postgres que siempre existe)
until docker exec "${POSTGRES_CONTAINER}" pg_isready -U postgres 2>/dev/null; do
    print_warning "Waiting for PostgreSQL to be ready..."
    sleep 2
done

# Crear usuario y base de datos si no existen (solución genérica que funciona siempre)
print_status "Verificando y creando usuario de base de datos..."
# Obtener valores del docker-compose (leer desde el archivo)
# El usuario se extrae desde POSTGRES_DB (ej: financial-win_dev -> financial-win)
DB_NAME=$(grep "POSTGRES_DB:" docker-compose.dev.yml 2>/dev/null | head -1 | sed 's/.*POSTGRES_DB: *\([^[:space:]]*\).*/\1/' || echo "${APP_NAME}_dev")
if [[ "$DB_NAME" == *_dev ]]; then
    DB_USER="${DB_NAME%_dev}"
elif [[ "$DB_NAME" == *_prod ]]; then
    DB_USER="${DB_NAME%_prod}"
else
    DB_USER="$APP_NAME"
fi
DB_PASSWORD=$(grep "POSTGRES_PASSWORD:" docker-compose.dev.yml 2>/dev/null | head -1 | sed 's/.*POSTGRES_PASSWORD: *\([^[:space:]]*\).*/\1/' || echo "$APP_NAME")

# Crear usuario si no existe
docker exec "${POSTGRES_CONTAINER}" psql -U postgres -c "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE ROLE \"$DB_USER\" WITH LOGIN PASSWORD '$DB_PASSWORD';
        RAISE NOTICE 'Usuario $DB_USER creado';
    ELSE
        RAISE NOTICE 'Usuario $DB_USER ya existe';
        -- Actualizar contraseña por si acaso
        ALTER ROLE \"$DB_USER\" WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;" 2>/dev/null || print_warning "No se pudo crear/actualizar el usuario (puede que ya exista)"

# Crear base de datos si no existe
docker exec "${POSTGRES_CONTAINER}" psql -U postgres -c "
SELECT 'CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec" 2>/dev/null || true

# Otorgar privilegios
docker exec "${POSTGRES_CONTAINER}" psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";" 2>/dev/null || true

print_status "PostgreSQL is ready!"

print_status "Building and starting API..."
# Use cache busting to ensure dependencies are always installed
CACHE_BUST=$(date +%s)
docker-compose -f docker-compose.dev.yml build --build-arg CACHE_BUST=$CACHE_BUST api
docker-compose -f docker-compose.dev.yml up -d api

print_status "Building and starting Web frontend..."
docker-compose -f docker-compose.dev.yml up -d web

print_status "Starting Adminer (Database Admin Tool)..."
docker-compose -f docker-compose.dev.yml up -d adminer

print_status "Waiting for services to be ready..."
sleep 15

# Health checks
print_status "Checking API health..."
if curl -f http://localhost:6000/health > /dev/null 2>&1; then
    print_status "✅ API is healthy"
else
    print_warning "⚠️ API health check failed"
fi

print_status "Checking Web health..."
if curl -f http://localhost:3014/health > /dev/null 2>&1; then
    print_status "✅ Web frontend is healthy"
else
    print_warning "⚠️ Web frontend health check failed"
fi

print_status "🎉 Development environment is ready!"
echo ""
echo "📊 Services:"
echo "  - API: http://localhost:6000"
echo "  - Web: http://localhost:3014"
echo "  - API Docs: http://localhost:6000/api/docs"
echo "  - Adminer (DB Admin): http://localhost:8081"
echo "  - PostgreSQL: localhost:5432"
echo ""
echo "🔧 Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "  - Stop services: docker-compose -f docker-compose.dev.yml down"
echo "  - Restart services: docker-compose -f docker-compose.dev.yml restart"
echo "  - Database shell: docker exec -it ${POSTGRES_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME}"
