#!/bin/bash

# =============================================================================
# Script interactivo para cambiar puertos de todos los módulos
# =============================================================================
# Uso: ./scripts/change-ports.sh
# =============================================================================

# No usar set -e porque puede causar que el script se detenga inesperadamente
# set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Puertos por defecto
BACKEND_PORT=6000
FRONTEND_PORT=3010
DATABASE_PORT=5432
ADMINER_PORT=8081

# Cambiar al directorio del proyecto (raíz del repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Función para obtener puerto actual de un servicio
get_current_port() {
    local service=$1
    local port=""
    
    case $service in
        backend)
            # Buscar en docker-compose.dev.yml (formato: '6000:6000' o "6000:6000")
            if [ -f "docker-compose.dev.yml" ]; then
                port=$(grep -A 10 "api:" docker-compose.dev.yml 2>/dev/null | grep -E "ports:" -A 2 | grep -oE "['\"]?[0-9]+:['\"]?[0-9]+" | head -1 | cut -d: -f1 | tr -d "'\"" 2>/dev/null || echo "")
            fi
            if [ -z "$port" ] && [ -f "apps/api/src/common/config/app.config.ts" ]; then
                port=$(grep "default(6000)" apps/api/src/common/config/app.config.ts 2>/dev/null | grep -oE "[0-9]+" | head -1 2>/dev/null || echo "")
            fi
            if [ -z "$port" ] && [ -f "apps/api/.env.example" ]; then
                port=$(grep "^PORT=" apps/api/.env.example 2>/dev/null | cut -d= -f2 | tr -d ' ' 2>/dev/null || echo "")
            fi
            echo "${port:-6000}"
            ;;
        frontend)
            # Buscar en docker-compose.dev.yml (formato: '3010:3010' o "3010:3010")
            if [ -f "docker-compose.dev.yml" ]; then
                port=$(grep -A 10 "web:" docker-compose.dev.yml 2>/dev/null | grep -E "ports:" -A 2 | grep -oE "['\"]?[0-9]+:['\"]?[0-9]+" | head -1 | cut -d: -f1 | tr -d "'\"" 2>/dev/null || echo "")
            fi
            if [ -z "$port" ] && [ -f "apps/web/vite.config.ts" ]; then
                port=$(grep "port:" apps/web/vite.config.ts 2>/dev/null | grep -oE "[0-9]+" | head -1 2>/dev/null || echo "")
            fi
            echo "${port:-3010}"
            ;;
        database)
            # Buscar en docker-compose.dev.yml (formato: '5432:5432' o "5432:5432")
            if [ -f "docker-compose.dev.yml" ]; then
                port=$(grep -A 10 "postgres:" docker-compose.dev.yml 2>/dev/null | grep -E "ports:" -A 2 | grep -oE "['\"]?[0-9]+:['\"]?[0-9]+" | head -1 | cut -d: -f1 | tr -d "'\"" 2>/dev/null || echo "")
            fi
            if [ -z "$port" ] && [ -f "apps/api/.env.example" ]; then
                port=$(grep "^DB_PORT=" apps/api/.env.example 2>/dev/null | cut -d= -f2 | tr -d ' ' 2>/dev/null || echo "")
            fi
            echo "${port:-5432}"
            ;;
        adminer)
            # Buscar en docker-compose.dev.yml (formato: '8081:8080' o "8081:8080")
            if [ -f "docker-compose.dev.yml" ]; then
                port=$(grep -A 10 "adminer:" docker-compose.dev.yml 2>/dev/null | grep -E "ports:" -A 2 | grep -oE "['\"]?[0-9]+:['\"]?[0-9]+" | head -1 | cut -d: -f1 | tr -d "'\"" 2>/dev/null || echo "")
            fi
            echo "${port:-8081}"
            ;;
    esac
}

# Función para validar puerto
validate_port() {
    local port=$1
    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
        return 1
    fi
    return 0
}

# Función para verificar disponibilidad (deshabilitada - siempre retorna éxito)
check_port_available() {
    # No verificar disponibilidad de puertos - siempre permitir el cambio
    return 0
}

# Variable global para almacenar el puerto seleccionado
SELECTED_PORT=""

# Función para solicitar puerto con formato claro
ask_port() {
    local module_name=$1
    local service_key=$2
    local default_port=$3
    local current_port=$(get_current_port "$service_key")
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}🔧 Configurar puerto para: ${YELLOW}${module_name}${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "  Puerto actual detectado: ${GREEN}${current_port}${NC}"
    echo ""
    
    while true; do
        echo -ne "${YELLOW}${module_name} puerto ${current_port} -> ${NC}"
        # Leer input del usuario directamente desde stdin
        read new_port
        
        # Si está vacío, usar el puerto actual (no cambiar)
        if [ -z "$new_port" ]; then
            echo -e "${YELLOW}⚠️  No se ingresó puerto. Se mantendrá el puerto actual: ${current_port}${NC}"
            SELECTED_PORT="$current_port"
            return 0
        fi
        
        if ! validate_port "$new_port"; then
            echo -e "${RED}❌ Puerto inválido. Debe ser un número entre 1024 y 65535${NC}"
            continue
        fi
        
        if [ "$new_port" == "$current_port" ]; then
            echo -e "${YELLOW}⚠️  El puerto es el mismo que el actual. No se realizarán cambios.${NC}"
            SELECTED_PORT="$current_port"
            return 0
        fi
        
        # Confirmar el cambio con formato claro
        echo -e "${GREEN}✓ ${module_name} puerto ${current_port} -> ${new_port}${NC}"
        SELECTED_PORT="$new_port"
        return 0
    done
}

# Función para actualizar docker-compose.dev.yml
update_docker_compose() {
    local old_backend=$1
    local new_backend=$2
    local old_frontend=$3
    local new_frontend=$4
    local old_db=$5
    local new_db=$6
    local old_adminer=$7
    local new_adminer=$8
    
    local file="docker-compose.dev.yml"
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠️  Archivo no encontrado: ${file}${NC}"
        return
    fi
    
    local temp_file="${file}.tmp"
    cp "$file" "$temp_file"
    local updated=false
    
    # Actualizar puertos del backend (api service)
    if [ "$old_backend" != "$new_backend" ]; then
        # Actualizar ports: - '6000:6000'
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|'${old_backend}:${old_backend}'|'${new_backend}:${new_backend}'|g" "$temp_file"
            sed -i '' "s|\"${old_backend}:${old_backend}\"|\"${new_backend}:${new_backend}\"|g" "$temp_file"
            # Actualizar healthcheck URL
            sed -i '' "s|localhost:${old_backend}/health|localhost:${new_backend}/health|g" "$temp_file"
        else
            sed -i "s|'${old_backend}:${old_backend}'|'${new_backend}:${new_backend}'|g" "$temp_file"
            sed -i "s|\"${old_backend}:${old_backend}\"|\"${new_backend}:${new_backend}\"|g" "$temp_file"
            sed -i "s|localhost:${old_backend}/health|localhost:${new_backend}/health|g" "$temp_file"
        fi
        updated=true
    fi
    
    # Actualizar puertos del frontend (web service)
    if [ "$old_frontend" != "$new_frontend" ]; then
        # Actualizar ports: - '3010:3010'
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|'${old_frontend}:${old_frontend}'|'${new_frontend}:${new_frontend}'|g" "$temp_file"
            sed -i '' "s|\"${old_frontend}:${old_frontend}\"|\"${new_frontend}:${new_frontend}\"|g" "$temp_file"
            # Actualizar healthcheck URL
            sed -i '' "s|localhost:${old_frontend}/|localhost:${new_frontend}/|g" "$temp_file"
        else
            sed -i "s|'${old_frontend}:${old_frontend}'|'${new_frontend}:${new_frontend}'|g" "$temp_file"
            sed -i "s|\"${old_frontend}:${old_frontend}\"|\"${new_frontend}:${new_frontend}\"|g" "$temp_file"
            sed -i "s|localhost:${old_frontend}/|localhost:${new_frontend}/|g" "$temp_file"
        fi
        updated=true
    fi
    
    # Actualizar puertos de la base de datos (postgres service)
    if [ "$old_db" != "$new_db" ]; then
        # IMPORTANTE: PostgreSQL siempre escucha en 5432 dentro del contenedor
        # Solo cambiamos el puerto del host (mapeo: ${new_db}:5432)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # Actualizar mapeo de puertos: cambiar solo el puerto del host
            # Formato: '${old_db}:5432' -> '${new_db}:5432'
            sed -i '' "s|'${old_db}:5432'|'${new_db}:5432'|g" "$temp_file"
            sed -i '' "s|\"${old_db}:5432\"|\"${new_db}:5432\"|g" "$temp_file"
            # También manejar formato antiguo '${old_db}:${old_db}' si existe
            sed -i '' "s|'${old_db}:${old_db}'|'${new_db}:5432'|g" "$temp_file"
            sed -i '' "s|\"${old_db}:${old_db}\"|\"${new_db}:5432\"|g" "$temp_file"
            # NO actualizar DATABASE_URL aquí - siempre debe usar puerto 5432 (interno)
            # El DATABASE_URL en docker-compose.dev.yml debe mantener @postgres:5432/
            # Solo actualizamos DB_PORT en environment para mantener consistencia
            # (aunque DB_PORT siempre será 5432 para conexiones internas)
        else
            sed -i "s|'${old_db}:5432'|'${new_db}:5432'|g" "$temp_file"
            sed -i "s|\"${old_db}:5432\"|\"${new_db}:5432\"|g" "$temp_file"
            sed -i "s|'${old_db}:${old_db}'|'${new_db}:5432'|g" "$temp_file"
            sed -i "s|\"${old_db}:${old_db}\"|\"${new_db}:5432\"|g" "$temp_file"
        fi
        updated=true
    fi
    
    # Actualizar puertos de Adminer (solo el puerto del host)
    if [ "$old_adminer" != "$new_adminer" ]; then
        # Actualizar ports: - '8081:8080' (solo cambiar el primero)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|'${old_adminer}:8080'|'${new_adminer}:8080'|g" "$temp_file"
            sed -i '' "s|\"${old_adminer}:8080\"|\"${new_adminer}:8080\"|g" "$temp_file"
        else
            sed -i "s|'${old_adminer}:8080'|'${new_adminer}:8080'|g" "$temp_file"
            sed -i "s|\"${old_adminer}:8080\"|\"${new_adminer}:8080\"|g" "$temp_file"
        fi
        updated=true
    fi
    
    if [ "$updated" = true ]; then
        mv "$temp_file" "$file"
        echo -e "${GREEN}✓ Actualizado: ${file}${NC}"
        return 0
    else
        rm -f "$temp_file"
        return 1
    fi
}

# Función para actualizar apps/api/.env.example
update_api_env_example() {
    local old_backend=$1
    local new_backend=$2
    local old_frontend=$3
    local new_frontend=$4
    local old_db=$5
    local new_db=$6
    
    local file="apps/api/.env.example"
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠️  Archivo no encontrado: ${file}${NC}"
        return
    fi
    
    local temp_file="${file}.tmp"
    cp "$file" "$temp_file"
    local updated=false
    
    # Actualizar PORT=6000
    if [ "$old_backend" != "$new_backend" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^PORT=${old_backend}\$|PORT=${new_backend}|" "$temp_file"
            sed -i '' "s|^PORT=${old_backend}[[:space:]]|PORT=${new_backend} |" "$temp_file"
        else
            sed -i "s|^PORT=${old_backend}\$|PORT=${new_backend}|" "$temp_file"
            sed -i "s|^PORT=${old_backend}[[:space:]]|PORT=${new_backend} |" "$temp_file"
        fi
        updated=true
    fi
    
    # Actualizar DB_PORT=5432
    if [ "$old_db" != "$new_db" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^DB_PORT=${old_db}\$|DB_PORT=${new_db}|" "$temp_file"
            sed -i '' "s|^DB_PORT=${old_db}[[:space:]]|DB_PORT=${new_db} |" "$temp_file"
        else
            sed -i "s|^DB_PORT=${old_db}\$|DB_PORT=${new_db}|" "$temp_file"
            sed -i "s|^DB_PORT=${old_db}[[:space:]]|DB_PORT=${new_db} |" "$temp_file"
        fi
        updated=true
    fi
    
    # Actualizar DATABASE_URL=postgresql://jason:jason@postgres:5432/jason_dev
    if [ "$old_db" != "$new_db" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|@postgres:${old_db}/|@postgres:${new_db}/|g" "$temp_file"
            sed -i '' "s|@localhost:${old_db}/|@localhost:${new_db}/|g" "$temp_file"
        else
            sed -i "s|@postgres:${old_db}/|@postgres:${new_db}/|g" "$temp_file"
            sed -i "s|@localhost:${old_db}/|@localhost:${new_db}/|g" "$temp_file"
        fi
        updated=true
    fi
    
    # Actualizar CORS_ORIGIN=http://localhost:3010
    if [ "$old_frontend" != "$new_frontend" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # Buscar específicamente CORS_ORIGIN con el puerto antiguo
            sed -i '' "s|CORS_ORIGIN=http://localhost:${old_frontend}\$|CORS_ORIGIN=http://localhost:${new_frontend}|g" "$temp_file"
            sed -i '' "s|CORS_ORIGIN=http://localhost:${old_frontend}[[:space:]]|CORS_ORIGIN=http://localhost:${new_frontend} |g" "$temp_file"
            # También buscar en URLs con múltiples orígenes separados por coma
            sed -i '' "s|\(CORS_ORIGIN=.*\)localhost:${old_frontend}\(.*\)|\1localhost:${new_frontend}\2|g" "$temp_file"
        else
            sed -i "s|CORS_ORIGIN=http://localhost:${old_frontend}\$|CORS_ORIGIN=http://localhost:${new_frontend}|g" "$temp_file"
            sed -i "s|CORS_ORIGIN=http://localhost:${old_frontend}[[:space:]]|CORS_ORIGIN=http://localhost:${new_frontend} |g" "$temp_file"
            sed -i "s|\(CORS_ORIGIN=.*\)localhost:${old_frontend}\(.*\)|\1localhost:${new_frontend}\2|g" "$temp_file"
        fi
        updated=true
    fi
    
    # Actualizar OIDC_REDIRECT_URI=http://localhost:6000/auth/callback
    if [ "$old_backend" != "$new_backend" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|localhost:${old_backend}/auth/callback|localhost:${new_backend}/auth/callback|g" "$temp_file"
        else
            sed -i "s|localhost:${old_backend}/auth/callback|localhost:${new_backend}/auth/callback|g" "$temp_file"
        fi
        updated=true
    fi
    
    # Actualizar OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3010
    if [ "$old_frontend" != "$new_frontend" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # Buscar específicamente OIDC_POST_LOGOUT_REDIRECT_URI con el puerto antiguo
            sed -i '' "s|OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:${old_frontend}\$|OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:${new_frontend}|g" "$temp_file"
            sed -i '' "s|OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:${old_frontend}[[:space:]]|OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:${new_frontend} |g" "$temp_file"
            # También buscar cualquier ocurrencia de localhost:PORT en esta variable
            sed -i '' "s|\(OIDC_POST_LOGOUT_REDIRECT_URI=.*\)localhost:${old_frontend}\(.*\)|\1localhost:${new_frontend}\2|g" "$temp_file"
        else
            sed -i "s|OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:${old_frontend}\$|OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:${new_frontend}|g" "$temp_file"
            sed -i "s|OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:${old_frontend}[[:space:]]|OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:${new_frontend} |g" "$temp_file"
            sed -i "s|\(OIDC_POST_LOGOUT_REDIRECT_URI=.*\)localhost:${old_frontend}\(.*\)|\1localhost:${new_frontend}\2|g" "$temp_file"
        fi
        updated=true
    fi
    
    if [ "$updated" = true ]; then
        mv "$temp_file" "$file"
        echo -e "${GREEN}✓ Actualizado: ${file}${NC}"
        return 0
    else
        rm -f "$temp_file"
        return 1
    fi
}

# Función para actualizar apps/web/.env.example
update_web_env_example() {
    local old_backend=$1
    local new_backend=$2
    
    local file="apps/web/.env.example"
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠️  Archivo no encontrado: ${file}${NC}"
        return
    fi
    
    local temp_file="${file}.tmp"
    cp "$file" "$temp_file"
    local updated=false
    
    # Actualizar VITE_API_URL=http://localhost:6000
    if [ "$old_backend" != "$new_backend" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # Buscar específicamente VITE_API_URL con el puerto antiguo
            sed -i '' "s|VITE_API_URL=http://localhost:${old_backend}\$|VITE_API_URL=http://localhost:${new_backend}|g" "$temp_file"
            sed -i '' "s|VITE_API_URL=http://localhost:${old_backend}[[:space:]]|VITE_API_URL=http://localhost:${new_backend} |g" "$temp_file"
            # También buscar cualquier ocurrencia de localhost:PORT en esta variable
            sed -i '' "s|\(VITE_API_URL=.*\)localhost:${old_backend}\(.*\)|\1localhost:${new_backend}\2|g" "$temp_file"
        else
            sed -i "s|VITE_API_URL=http://localhost:${old_backend}\$|VITE_API_URL=http://localhost:${new_backend}|g" "$temp_file"
            sed -i "s|VITE_API_URL=http://localhost:${old_backend}[[:space:]]|VITE_API_URL=http://localhost:${new_backend} |g" "$temp_file"
            sed -i "s|\(VITE_API_URL=.*\)localhost:${old_backend}\(.*\)|\1localhost:${new_backend}\2|g" "$temp_file"
        fi
        updated=true
    fi
    
    if [ "$updated" = true ]; then
        mv "$temp_file" "$file"
        echo -e "${GREEN}✓ Actualizado: ${file}${NC}"
        return 0
    else
        rm -f "$temp_file"
        return 1
    fi
}

# Función para actualizar apps/api/src/common/config/app.config.ts
update_app_config() {
    local old_backend=$1
    local new_backend=$2
    
    local file="apps/api/src/common/config/app.config.ts"
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠️  Archivo no encontrado: ${file}${NC}"
        return
    fi
    
    if [ "$old_backend" == "$new_backend" ]; then
        return
    fi
    
    local temp_file="${file}.tmp"
    cp "$file" "$temp_file"
    
    # Actualizar port: z.coerce.number().default(6000)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|default(${old_backend})|default(${new_backend})|g" "$temp_file"
    else
        sed -i "s|default(${old_backend})|default(${new_backend})|g" "$temp_file"
    fi
    
    mv "$temp_file" "$file"
    echo -e "${GREEN}✓ Actualizado: ${file}${NC}"
}

# Función para actualizar apps/web/vite.config.ts
update_vite_config() {
    local old_frontend=$1
    local new_frontend=$2
    local old_backend=$3
    local new_backend=$4
    
    local file="apps/web/vite.config.ts"
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠️  Archivo no encontrado: ${file}${NC}"
        return
    fi
    
    local temp_file="${file}.tmp"
    cp "$file" "$temp_file"
    local updated=false
    
    # Actualizar port: 3010
    if [ "$old_frontend" != "$new_frontend" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|port: ${old_frontend}|port: ${new_frontend}|g" "$temp_file"
        else
            sed -i "s|port: ${old_frontend}|port: ${new_frontend}|g" "$temp_file"
        fi
        updated=true
    fi
    
    # Actualizar target: 'http://api:6000'
    if [ "$old_backend" != "$new_backend" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|api:${old_backend}|api:${new_backend}|g" "$temp_file"
        else
            sed -i "s|api:${old_backend}|api:${new_backend}|g" "$temp_file"
        fi
        updated=true
    fi
    
    if [ "$updated" = true ]; then
        mv "$temp_file" "$file"
        echo -e "${GREEN}✓ Actualizado: ${file}${NC}"
        return 0
    else
        rm -f "$temp_file"
        return 1
    fi
}

# Banner inicial
# Usar clear solo si estamos en una terminal interactiva
if [ -t 0 ]; then
    clear 2>/dev/null || true
fi
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🔧 Configuración de Puertos - Script Interactivo         ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Obtener puertos actuales (con manejo de errores)
CURRENT_BACKEND=$(get_current_port backend 2>/dev/null || echo "6000")
CURRENT_FRONTEND=$(get_current_port frontend 2>/dev/null || echo "3010")
CURRENT_DATABASE=$(get_current_port database 2>/dev/null || echo "5432")
CURRENT_ADMINER=$(get_current_port adminer 2>/dev/null || echo "8081")

echo -e "${GREEN}Puertos actuales detectados:${NC}"
echo -e "  Backend:   ${CYAN}${CURRENT_BACKEND}${NC}"
echo -e "  Frontend:  ${CYAN}${CURRENT_FRONTEND}${NC}"
echo -e "  Database:  ${CYAN}${CURRENT_DATABASE}${NC}"
echo -e "  Adminer:   ${CYAN}${CURRENT_ADMINER}${NC}"
echo ""

read -p "$(echo -e ${YELLOW}¿Desea cambiar los puertos? [y/N]: ${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Operación cancelada${NC}"
    exit 0
fi

# Solicitar puertos para cada servicio con formato claro
echo -e "${BLUE}Iniciando configuración de puertos...${NC}"
ask_port "Backend" "backend" "$BACKEND_PORT"
NEW_BACKEND="$SELECTED_PORT"
ask_port "Frontend" "frontend" "$FRONTEND_PORT"
NEW_FRONTEND="$SELECTED_PORT"
ask_port "Database" "database" "$DATABASE_PORT"
NEW_DATABASE="$SELECTED_PORT"
ask_port "Adminer" "adminer" "$ADMINER_PORT"
NEW_ADMINER="$SELECTED_PORT"

# Resumen de cambios
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Resumen de cambios:${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "  Backend:   ${CURRENT_BACKEND} -> ${GREEN}${NEW_BACKEND}${NC}"
echo -e "  Frontend:  ${CURRENT_FRONTEND} -> ${GREEN}${NEW_FRONTEND}${NC}"
echo -e "  Database:  ${CURRENT_DATABASE} -> ${GREEN}${NEW_DATABASE}${NC}"
echo -e "  Adminer:   ${CURRENT_ADMINER} -> ${GREEN}${NEW_ADMINER}${NC}"
echo ""

read -p "$(echo -e ${YELLOW}¿Confirmar cambios? [y/N]: ${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Operación cancelada${NC}"
    exit 0
fi

# Aplicar cambios
echo ""
echo -e "${BLUE}🔧 Aplicando cambios...${NC}"
echo ""

CHANGES_COUNT=0

# Actualizar docker-compose.dev.yml
if update_docker_compose "$CURRENT_BACKEND" "$NEW_BACKEND" "$CURRENT_FRONTEND" "$NEW_FRONTEND" "$CURRENT_DATABASE" "$NEW_DATABASE" "$CURRENT_ADMINER" "$NEW_ADMINER"; then
    CHANGES_COUNT=$((CHANGES_COUNT + 1))
fi

# Actualizar apps/api/.env.example
if update_api_env_example "$CURRENT_BACKEND" "$NEW_BACKEND" "$CURRENT_FRONTEND" "$NEW_FRONTEND" "$CURRENT_DATABASE" "$NEW_DATABASE"; then
    CHANGES_COUNT=$((CHANGES_COUNT + 1))
fi

# Actualizar apps/web/.env.example
if update_web_env_example "$CURRENT_BACKEND" "$NEW_BACKEND"; then
    CHANGES_COUNT=$((CHANGES_COUNT + 1))
fi

# Actualizar apps/api/src/common/config/app.config.ts
if [ "$CURRENT_BACKEND" != "$NEW_BACKEND" ]; then
    update_app_config "$CURRENT_BACKEND" "$NEW_BACKEND"
    CHANGES_COUNT=$((CHANGES_COUNT + 1))
fi

# Actualizar apps/web/vite.config.ts
if [ "$CURRENT_FRONTEND" != "$NEW_FRONTEND" ] || [ "$CURRENT_BACKEND" != "$NEW_BACKEND" ]; then
    update_vite_config "$CURRENT_FRONTEND" "$NEW_FRONTEND" "$CURRENT_BACKEND" "$NEW_BACKEND"
    CHANGES_COUNT=$((CHANGES_COUNT + 1))
fi

echo ""
echo -e "${GREEN}✅ Cambios completados exitosamente${NC}"
echo -e "${BLUE}📊 Archivos modificados: ${CHANGES_COUNT}${NC}"
echo ""
echo -e "${YELLOW}⚠️  Recordatorios:${NC}"
echo -e "  1. ${GREEN}✓ Los archivos .env.example han sido actualizados aufinancial-wináticamente${NC}"
echo -e "     Los desarrolladores pueden copiar .env.example a .env.dev y tendrán los puertos correctos"
echo -e "  2. Si usas Docker, reinicia los contenedores:"
echo -e "     ${CYAN}docker compose -f docker-compose.dev.yml down${NC}"
echo -e "     ${CYAN}docker compose -f docker-compose.dev.yml up -d${NC}"
echo -e "  3. Verifica las variables de entorno en los archivos .env.dev si los tienes configurados"
echo -e "  4. Los servicios estarán disponibles en:"
echo -e "     - Backend:   http://localhost:${NEW_BACKEND}"
echo -e "     - Frontend:  http://localhost:${NEW_FRONTEND}"
echo -e "     - Database:  localhost:${NEW_DATABASE}"
echo -e "     - Adminer:   http://localhost:${NEW_ADMINER}"
echo ""
