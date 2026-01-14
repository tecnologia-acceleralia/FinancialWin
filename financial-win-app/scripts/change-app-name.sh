#!/bin/bash

# =============================================================================
# Script para cambiar el nombre de la aplicación en todo el proyecto
# =============================================================================
# Uso: ./scripts/change-app-name.sh [nombre-nuevo]
# Ejemplo: ./scripts/change-app-name.sh mi-aplicacion
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Cambiar al directorio del proyecto (raíz del repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Función para leer valor desde .app-config
get_value_from_config() {
    local key=$1
    local default=$2
    
    if [ -f ".app-config" ]; then
        # Buscar la línea que contiene la clave
        local line=$(grep "^${key}=" .app-config 2>/dev/null | head -1)
        if [ -n "$line" ]; then
            # Extraer el valor (maneja tanto con comillas como sin comillas)
            local value=$(echo "$line" | sed "s/^${key}=//" | sed 's/^"\(.*\)"$/\1/' | sed 's/^\([^[:space:]#]*\).*/\1/' | tr -d ' ')
            if [ -n "$value" ]; then
                echo "$value"
                return
            fi
        fi
    fi
    
    echo "${default:-}"
}

# Función para obtener nombre actual de Docker desde .app-config
get_docker_name() {
    local name=$(get_value_from_config "APP_NAME" "financial-win")
    echo "${name}"
}

# Función para obtener puerto desde .app-config
get_port_from_config() {
    local port_name=$1
    local default=$2
    get_value_from_config "${port_name}" "${default}"
}

# Función para obtener nombre actual del package.json
get_package_name() {
    if [ -f "package.json" ]; then
        local name=$(grep '"name":' package.json 2>/dev/null | head -1 | sed 's/.*"name": *"\([^"]*\)".*/\1/' || echo "")
        echo "${name:-financial-win-project}"
    else
        echo "financial-win-project"
    fi
}

# Función para validar nombre
validate_name() {
    local name=$1
    # Validar que solo contenga letras, números, guiones y guiones bajos
    if ! [[ "$name" =~ ^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$ ]]; then
        return 1
    fi
    # Validar longitud mínima y máxima
    if [ ${#name} -lt 2 ] || [ ${#name} -gt 50 ]; then
        return 1
    fi
    return 0
}

# Función para convertir nombre a formato válido
normalize_name() {
    local name=$1
    # Convertir a minúsculas
    name=$(echo "$name" | tr '[:upper:]' '[:lower:]')
    # Reemplazar espacios y caracteres especiales con guiones
    name=$(echo "$name" | sed 's/[^a-z0-9_-]/-/g')
    # Eliminar guiones múltiples
    name=$(echo "$name" | sed 's/-\+/-/g')
    # Eliminar guiones al inicio y final
    name=$(echo "$name" | sed 's/^-\+//;s/-\+$//')
    echo "$name"
}

# Banner inicial
clear
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🏷️  Cambio de Nombre de Aplicación                      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Obtener nombres actuales
CURRENT_DOCKER_NAME=$(get_docker_name)
CURRENT_PACKAGE_NAME=$(get_package_name)

echo -e "${GREEN}Nombres actuales detectados:${NC}"
echo -e "  Nombre Docker (contenedores/DB): ${CYAN}${CURRENT_DOCKER_NAME}${NC}"
echo -e "  Nombre Package.json:             ${CYAN}${CURRENT_PACKAGE_NAME}${NC}"
echo ""

# Si se proporciona nombre como argumento, usarlo; si no, preguntar
if [ $# -ge 1 ]; then
    NEW_NAME="$1"
else
    echo -ne "${YELLOW}Ingrese el nuevo nombre de la aplicación: ${NC}"
    read NEW_NAME
fi

if [ -z "$NEW_NAME" ]; then
    echo -e "${RED}❌ Error: El nombre no puede estar vacío${NC}"
    exit 1
fi

# Normalizar nombre
NORMALIZED_NAME=$(normalize_name "$NEW_NAME")

# Validar nombre normalizado
if ! validate_name "$NORMALIZED_NAME"; then
    echo -e "${RED}❌ Error: El nombre '${NEW_NAME}' no es válido${NC}"
    echo -e "${YELLOW}El nombre debe:${NC}"
    echo -e "  - Contener solo letras minúsculas, números, guiones y guiones bajos"
    echo -e "  - Tener entre 2 y 50 caracteres"
    echo -e "  - Empezar y terminar con letra o número"
    echo ""
    echo -e "${YELLOW}Nombre normalizado sugerido: ${CYAN}${NORMALIZED_NAME}${NC}"
    echo -ne "${YELLOW}¿Usar el nombre normalizado '${NORMALIZED_NAME}'? [y/N]: ${NC}"
    read -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Operación cancelada${NC}"
        exit 0
    fi
    NEW_NAME="$NORMALIZED_NAME"
else
    if [ "$NEW_NAME" != "$NORMALIZED_NAME" ]; then
        echo -e "${YELLOW}⚠️  El nombre será normalizado a: ${CYAN}${NORMALIZED_NAME}${NC}"
        NEW_NAME="$NORMALIZED_NAME"
    fi
fi

# Configurar cambios - siempre cambiar todo
CHANGE_DOCKER=true
CHANGE_PACKAGE=true
NEW_DOCKER_NAME="$NEW_NAME"
NEW_PACKAGE_NAME="$NEW_NAME"

# Actualizar archivo de configuración centralizado (.app-config)
echo -e "${YELLOW}Actualizando configuración centralizada...${NC}"
APP_NAME_TITLE=$(echo "$NEW_NAME" | awk -F'-' '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2));}1' OFS='-')
APP_NAME_UPPER=$(echo "$NEW_NAME" | tr '[:lower:]' '[:upper:]' | tr '-' '_')

# Preservar puertos existentes desde .app-config
POSTGRES_PORT=$(get_port_from_config "POSTGRES_PORT" "5555")
API_PORT=$(get_port_from_config "API_PORT" "6006")
WEB_PORT=$(get_port_from_config "WEB_PORT" "3003")
ADMINER_PORT=$(get_port_from_config "ADMINER_PORT" "8880")

cat > .app-config <<EOF
# Configuración de la Aplicación
# Este archivo contiene el nombre de la aplicación usado en todo el proyecto
# NO editar manualmente - usar scripts/change-app-name.sh para cambiar

APP_NAME="${NEW_NAME}"
APP_NAME_UPPER="${APP_NAME_UPPER}"
APP_NAME_TITLE="${APP_NAME_TITLE}"

# Puertos de los servicios (puertos del host)
POSTGRES_PORT=${POSTGRES_PORT}
API_PORT=${API_PORT}
WEB_PORT=${WEB_PORT}
ADMINER_PORT=${ADMINER_PORT}

# Fecha de creación/última actualización
LAST_UPDATED="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
EOF

echo -e "${GREEN}✓ Actualizado: .app-config${NC}"
CHANGES=$((CHANGES + 1))

# Resumen de cambios
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Resumen de cambios:${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "  Docker: ${CURRENT_DOCKER_NAME} → ${GREEN}${NEW_DOCKER_NAME}${NC}"
echo -e "    - Contenedores: ${CURRENT_DOCKER_NAME}-*-dev"
echo -e "    - Base de datos: ${CURRENT_DOCKER_NAME}_dev"
echo -e "    - Usuario DB: ${CURRENT_DOCKER_NAME}"
echo -e "    - Red: ${CURRENT_DOCKER_NAME}-network"
echo -e "  Package.json: ${CURRENT_PACKAGE_NAME} → ${GREEN}${NEW_PACKAGE_NAME}${NC}"
echo -e "    - Nombre del proyecto"
echo -e "    - Descripciones y referencias"
echo -e "    - Documentación (README.md, .mdc)"
echo -e "    - Títulos de Swagger"
echo ""

echo -ne "${YELLOW}¿Confirmar cambios? [y/N]: ${NC}"
read -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Operación cancelada${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔧 Aplicando cambios...${NC}"
echo ""

# Contador de cambios
CHANGES=0

# Archivos ya procesados (para evitar contar múltiples veces)
PROCESSED_FILES=""

# Función para reemplazar en archivo
replace_in_file() {
    local file=$1
    local old=$2
    local new=$3
    
    if [ ! -f "$file" ]; then
        return
    fi
    
    # Escapar caracteres especiales para sed (usar | como delimitador)
    local old_escaped=$(echo "$old" | sed 's/[|&]/\\&/g')
    local new_escaped=$(echo "$new" | sed 's/[|&]/\\&/g')
    
    # Verificar si el archivo contiene el texto a reemplazar
    if ! grep -qF "$old" "$file" 2>/dev/null; then
        return
    fi
    
    # Realizar el reemplazo usando | como delimitador para evitar problemas con /
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|${old_escaped}|${new_escaped}|g" "$file"
    else
        # Linux
        sed -i "s|${old_escaped}|${new_escaped}|g" "$file"
    fi
    
    # Contar el archivo solo una vez
    if [[ ! "$PROCESSED_FILES" =~ "|$file|" ]]; then
        PROCESSED_FILES="${PROCESSED_FILES}|$file|"
        CHANGES=$((CHANGES + 1))
        echo -e "${GREEN}✓ Actualizado: ${file}${NC}"
    fi
}

# Cambiar nombres de Docker
echo -e "${YELLOW}Actualizando configuración de Docker...${NC}"
    
    # docker-compose.dev.yml y docker-compose.prod.yml
    for compose_file in docker-compose.dev.yml docker-compose.prod.yml; do
        if [ -f "$compose_file" ]; then
            # Contenedores
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}-postgres-dev" "${NEW_DOCKER_NAME}-postgres-dev"
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}-api-dev" "${NEW_DOCKER_NAME}-api-dev"
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}-web-dev" "${NEW_DOCKER_NAME}-web-dev"
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}-adminer-dev" "${NEW_DOCKER_NAME}-adminer-dev"
            
            # También buscar variantes sin -dev para producción
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}-postgres" "${NEW_DOCKER_NAME}-postgres"
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}-api" "${NEW_DOCKER_NAME}-api"
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}-web" "${NEW_DOCKER_NAME}-web"
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}-adminer" "${NEW_DOCKER_NAME}-adminer"
            
            # Base de datos
            replace_in_file "$compose_file" "POSTGRES_DB: ${CURRENT_DOCKER_NAME}_dev" "POSTGRES_DB: ${NEW_DOCKER_NAME}_dev"
            replace_in_file "$compose_file" "POSTGRES_DB: ${CURRENT_DOCKER_NAME}_prod" "POSTGRES_DB: ${NEW_DOCKER_NAME}_prod"
            replace_in_file "$compose_file" "POSTGRES_PASSWORD: ${CURRENT_DOCKER_NAME}" "POSTGRES_PASSWORD: ${NEW_DOCKER_NAME}"
            # Remover POSTGRES_USER si existe (ya no se usa - el script de inicialización crea el usuario desde POSTGRES_DB)
            replace_in_file "$compose_file" "POSTGRES_USER: ${CURRENT_DOCKER_NAME}" "# POSTGRES_USER no se establece - el script de inicialización crea el usuario desde POSTGRES_DB"
            replace_in_file "$compose_file" "POSTGRES_USER: ${NEW_DOCKER_NAME}" "# POSTGRES_USER no se establece - el script de inicialización crea el usuario desde POSTGRES_DB"
            
            # Variables de entorno del servicio API
            replace_in_file "$compose_file" "DB_USERNAME: ${CURRENT_DOCKER_NAME}" "DB_USERNAME: ${NEW_DOCKER_NAME}"
            replace_in_file "$compose_file" "DB_PASSWORD: ${CURRENT_DOCKER_NAME}" "DB_PASSWORD: ${NEW_DOCKER_NAME}"
            replace_in_file "$compose_file" "DB_NAME: ${CURRENT_DOCKER_NAME}_dev" "DB_NAME: ${NEW_DOCKER_NAME}_dev"
            replace_in_file "$compose_file" "DB_NAME: ${CURRENT_DOCKER_NAME}_prod" "DB_NAME: ${NEW_DOCKER_NAME}_prod"
            
            # DATABASE_URL
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}:${CURRENT_DOCKER_NAME}@postgres:5432/${CURRENT_DOCKER_NAME}_dev" "${NEW_DOCKER_NAME}:${NEW_DOCKER_NAME}@postgres:5432/${NEW_DOCKER_NAME}_dev"
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}:${CURRENT_DOCKER_NAME}@postgres:5432/${CURRENT_DOCKER_NAME}_prod" "${NEW_DOCKER_NAME}:${NEW_DOCKER_NAME}@postgres:5432/${NEW_DOCKER_NAME}_prod"
            
            # Healthcheck
            replace_in_file "$compose_file" "pg_isready -U ${CURRENT_DOCKER_NAME} -d ${CURRENT_DOCKER_NAME}_dev" "pg_isready -U ${NEW_DOCKER_NAME} -d ${NEW_DOCKER_NAME}_dev"
            replace_in_file "$compose_file" "pg_isready -U ${CURRENT_DOCKER_NAME} -d ${CURRENT_DOCKER_NAME}_prod" "pg_isready -U ${NEW_DOCKER_NAME} -d ${NEW_DOCKER_NAME}_prod"
            
            # Red
            replace_in_file "$compose_file" "${CURRENT_DOCKER_NAME}-network" "${NEW_DOCKER_NAME}-network"
        fi
    done
    
    # Actualizar nombre del proyecto Docker Compose (afecta prefijo de volúmenes y redes)
    # Docker Compose usa el nombre del directorio o COMPOSE_PROJECT_NAME
    # El prefijo se usa para: {project_name}_{volume_name} y {project_name}_{network_name}
    echo -e "${YELLOW}Actualizando nombre del proyecto Docker Compose...${NC}"
    
    # Detectar el nombre actual del proyecto Docker
    CURRENT_PROJECT_NAME=""
    if [ -f ".env" ] && grep -q "COMPOSE_PROJECT_NAME" ".env" 2>/dev/null; then
        CURRENT_PROJECT_NAME=$(grep "^COMPOSE_PROJECT_NAME=" .env 2>/dev/null | head -1 | sed 's/^COMPOSE_PROJECT_NAME=\([^[:space:]#]*\).*/\1/' | tr -d ' ' || echo "")
    fi
    
    # Si no se encuentra en .env, usar el nombre del directorio actual o "financial-win" como fallback
    if [ -z "$CURRENT_PROJECT_NAME" ]; then
        CURRENT_PROJECT_NAME=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
        # Si el directorio se llama "financial-win" o similar, usar "financial-win"
        if [[ "$CURRENT_PROJECT_NAME" == *"financial-win"* ]] || [ -z "$CURRENT_PROJECT_NAME" ]; then
            CURRENT_PROJECT_NAME="financial-win"
        fi
    fi
    
    echo -e "${CYAN}  Nombre del proyecto Docker actual: ${CURRENT_PROJECT_NAME}${NC}"
    echo -e "${CYAN}  Nuevo nombre del proyecto Docker: ${NEW_DOCKER_NAME}${NC}"
    
    # Buscar y actualizar archivos .env que puedan tener COMPOSE_PROJECT_NAME
    for env_file in .env .env.dev .env.local; do
        if [ -f "$env_file" ]; then
            if grep -q "COMPOSE_PROJECT_NAME" "$env_file" 2>/dev/null; then
                replace_in_file "$env_file" "COMPOSE_PROJECT_NAME=${CURRENT_PROJECT_NAME}" "COMPOSE_PROJECT_NAME=${NEW_DOCKER_NAME}"
                replace_in_file "$env_file" "COMPOSE_PROJECT_NAME=${CURRENT_DOCKER_NAME}" "COMPOSE_PROJECT_NAME=${NEW_DOCKER_NAME}"
            fi
        fi
    done
    
    # Crear o actualizar .env si no existe para establecer COMPOSE_PROJECT_NAME
    if [ ! -f ".env" ]; then
        echo "# Docker Compose Project Name" > .env
        echo "COMPOSE_PROJECT_NAME=${NEW_DOCKER_NAME}" >> .env
        echo -e "${GREEN}✓ Creado: .env con COMPOSE_PROJECT_NAME=${NEW_DOCKER_NAME}${NC}"
        if [[ ! "$PROCESSED_FILES" =~ "|.env|" ]]; then
            PROCESSED_FILES="${PROCESSED_FILES}|.env|"
            CHANGES=$((CHANGES + 1))
        fi
    elif ! grep -q "COMPOSE_PROJECT_NAME" ".env" 2>/dev/null; then
        echo "" >> .env
        echo "# Docker Compose Project Name" >> .env
        echo "COMPOSE_PROJECT_NAME=${NEW_DOCKER_NAME}" >> .env
        echo -e "${GREEN}✓ Actualizado: .env con COMPOSE_PROJECT_NAME=${NEW_DOCKER_NAME}${NC}"
        if [[ ! "$PROCESSED_FILES" =~ "|.env|" ]]; then
            PROCESSED_FILES="${PROCESSED_FILES}|.env|"
            CHANGES=$((CHANGES + 1))
        fi
    fi
    
    # Scripts que mencionan el nombre
    for script in scripts/*.sh; do
        if [ -f "$script" ]; then
            # Reemplazar referencias a contenedores en scripts
            replace_in_file "$script" "${CURRENT_DOCKER_NAME}-postgres-dev" "${NEW_DOCKER_NAME}-postgres-dev"
            replace_in_file "$script" "${CURRENT_DOCKER_NAME}-api-dev" "${NEW_DOCKER_NAME}-api-dev"
            replace_in_file "$script" "${CURRENT_DOCKER_NAME}-web-dev" "${NEW_DOCKER_NAME}-web-dev"
            replace_in_file "$script" "${CURRENT_DOCKER_NAME}-adminer-dev" "${NEW_DOCKER_NAME}-adminer-dev"
            # Reemplazar comandos psql y pg_isready
            replace_in_file "$script" "psql -U ${CURRENT_DOCKER_NAME} -d ${CURRENT_DOCKER_NAME}_dev" "psql -U ${NEW_DOCKER_NAME} -d ${NEW_DOCKER_NAME}_dev"
            replace_in_file "$script" "pg_isready -U ${CURRENT_DOCKER_NAME} -d ${CURRENT_DOCKER_NAME}_dev" "pg_isready -U ${NEW_DOCKER_NAME} -d ${NEW_DOCKER_NAME}_dev"
            # Reemplazar docker exec con contenedores
            replace_in_file "$script" "docker exec ${CURRENT_DOCKER_NAME}-postgres-dev" "docker exec ${NEW_DOCKER_NAME}-postgres-dev"
            replace_in_file "$script" "docker exec -it ${CURRENT_DOCKER_NAME}-postgres-dev" "docker exec -it ${NEW_DOCKER_NAME}-postgres-dev"
            # Reemplazar en comentarios y mensajes (con variantes de mayúsculas)
            replace_in_file "$script" "${CURRENT_DOCKER_NAME} MVP" "${NEW_DOCKER_NAME}"
            replace_in_file "$script" "${CURRENT_DOCKER_NAME} Development" "${NEW_DOCKER_NAME} Development"
            replace_in_file "$script" "Setting up ${CURRENT_DOCKER_NAME}" "Setting up ${NEW_DOCKER_NAME}"
            replace_in_file "$script" "${CURRENT_DOCKER_NAME} -" "${NEW_DOCKER_NAME} -"
        fi
    done
    
    # README.md y documentación - comandos Docker
    for doc_file in README.md mdc/*.mdc; do
        if [ -f "$doc_file" ]; then
            # Buscar y reemplazar referencias al nombre en comandos de ejemplo
            replace_in_file "$doc_file" "docker exec -it ${CURRENT_DOCKER_NAME}-postgres-dev" "docker exec -it ${NEW_DOCKER_NAME}-postgres-dev"
            replace_in_file "$doc_file" "psql -U ${CURRENT_DOCKER_NAME} -d ${CURRENT_DOCKER_NAME}_dev" "psql -U ${NEW_DOCKER_NAME} -d ${NEW_DOCKER_NAME}_dev"
            # Referencias en texto sobre la aplicación
            replace_in_file "$doc_file" "${CURRENT_DOCKER_NAME} MVP" "${NEW_DOCKER_NAME}"
            replace_in_file "$doc_file" "${CURRENT_DOCKER_NAME} Development" "${NEW_DOCKER_NAME} Development"
        fi
    done
    
    # Archivos de configuración de base de datos
    if [ -f "apps/api/src/common/config/database.config.ts" ]; then
        replace_in_file "apps/api/src/common/config/database.config.ts" "database: z.string().default('${CURRENT_DOCKER_NAME}_db')" "database: z.string().default('${NEW_DOCKER_NAME}_db')"
        replace_in_file "apps/api/src/common/config/database.config.ts" "database: process.env.DB_NAME || '${CURRENT_DOCKER_NAME}_db'" "database: process.env.DB_NAME || '${NEW_DOCKER_NAME}_db'"
    fi
    
    # Archivos .env.example - procesar solo los dos archivos específicos
    echo -e "${YELLOW}Actualizando archivos .env.example...${NC}"
    
    # Función para procesar el archivo .env.example del API
    # Solo actualiza las variables específicas que contienen el nombre de la aplicación
    process_api_env_example() {
        local env_file="apps/api/.env.example"
        if [ ! -f "$env_file" ]; then
            echo -e "${YELLOW}⚠️  Archivo no encontrado: ${env_file}${NC}"
            return
        fi
        
        echo -e "${BLUE}Procesando: ${env_file}${NC}"
        
        # Detectar el nombre actual que está en el archivo .env.example
        # Buscar en DB_USERNAME para detectar qué nombre se está usando
        local detected_name=$(grep "^DB_USERNAME=" "$env_file" 2>/dev/null | head -1 | sed 's/^DB_USERNAME=\([^[:space:]#]*\).*/\1/' | tr -d ' ' || echo "")
        
        # Si no se detecta, usar el nombre de Docker actual como fallback
        local name_to_replace="${detected_name:-${CURRENT_DOCKER_NAME}}"
        
        if [ -z "$name_to_replace" ]; then
            echo -e "${YELLOW}⚠️  No se pudo detectar el nombre actual en ${env_file}${NC}"
            return
        fi
        
        echo -e "${CYAN}  Detectado nombre en archivo: ${name_to_replace}${NC}"
        
        # Crear una copia temporal para trabajar
        local temp_file="${env_file}.tmp"
        cp "$env_file" "$temp_file"
        
        # Reemplazar solo las variables específicas solicitadas
        # Usar el nombre detectado en el archivo, no el de Docker
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS - usar sed con reemplazos directos
            sed -i '' \
                -e "s|^DB_USERNAME=${name_to_replace}|DB_USERNAME=${NEW_DOCKER_NAME}|" \
                -e "s|^DB_PASSWORD=${name_to_replace}|DB_PASSWORD=${NEW_DOCKER_NAME}|" \
                -e "s|^DB_NAME=${name_to_replace}_dev|DB_NAME=${NEW_DOCKER_NAME}_dev|" \
                -e "s|^DATABASE_URL=postgresql://${name_to_replace}:${name_to_replace}@postgres:5432/${name_to_replace}_dev|DATABASE_URL=postgresql://${NEW_DOCKER_NAME}:${NEW_DOCKER_NAME}@postgres:5432/${NEW_DOCKER_NAME}_dev|" \
                -e "s|^OIDC_CLIENT_ID=${name_to_replace}-client|OIDC_CLIENT_ID=${NEW_DOCKER_NAME}-client|" \
                "$temp_file"
        else
            # Linux
            sed -i \
                -e "s|^DB_USERNAME=${name_to_replace}|DB_USERNAME=${NEW_DOCKER_NAME}|" \
                -e "s|^DB_PASSWORD=${name_to_replace}|DB_PASSWORD=${NEW_DOCKER_NAME}|" \
                -e "s|^DB_NAME=${name_to_replace}_dev|DB_NAME=${NEW_DOCKER_NAME}_dev|" \
                -e "s|^DATABASE_URL=postgresql://${name_to_replace}:${name_to_replace}@postgres:5432/${name_to_replace}_dev|DATABASE_URL=postgresql://${NEW_DOCKER_NAME}:${NEW_DOCKER_NAME}@postgres:5432/${NEW_DOCKER_NAME}_dev|" \
                -e "s|^OIDC_CLIENT_ID=${name_to_replace}-client|OIDC_CLIENT_ID=${NEW_DOCKER_NAME}-client|" \
                "$temp_file"
        fi
        
        # Reemplazar el archivo original con el modificado
        mv "$temp_file" "$env_file"
        
        # Contar el archivo solo una vez
        if [[ ! "$PROCESSED_FILES" =~ "|$env_file|" ]]; then
            PROCESSED_FILES="${PROCESSED_FILES}|$env_file|"
            CHANGES=$((CHANGES + 1))
            echo -e "${GREEN}✓ Actualizado: ${env_file}${NC}"
        fi
    }
    
    # Función para procesar el archivo .env.example del Web
    # Solo actualiza VITE_APP_NAME
    process_web_env_example() {
        local env_file="apps/web/.env.example"
        if [ ! -f "$env_file" ]; then
            echo -e "${YELLOW}⚠️  Archivo no encontrado: ${env_file}${NC}"
            return
        fi
        
        echo -e "${BLUE}Procesando: ${env_file}${NC}"
        
        # Convertir nombre a formato para VITE_APP_NAME (Title-Case con guiones)
        # Ejemplo: mi-aplicacion -> Mi-Aplicacion
        VITE_APP_NAME=$(echo "$NEW_DOCKER_NAME" | awk -F'-' '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2));}1' OFS='-')
        CURRENT_VITE_APP_NAME=$(echo "$CURRENT_DOCKER_NAME" | awk -F'-' '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2));}1' OFS='-')
        
        # Crear una copia temporal para trabajar
        local temp_file="${env_file}.tmp"
        cp "$env_file" "$temp_file"
        
        # Actualizar VITE_APP_NAME con múltiples variantes posibles
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' \
                -e "s|^VITE_APP_NAME=${CURRENT_VITE_APP_NAME}$|VITE_APP_NAME=${VITE_APP_NAME}|g" \
                -e "s|^VITE_APP_NAME=financial-win-App$|VITE_APP_NAME=${VITE_APP_NAME}|g" \
                -e "s|^VITE_APP_NAME=financial-win-app$|VITE_APP_NAME=${VITE_APP_NAME}|g" \
                -e "s|^VITE_APP_NAME=${CURRENT_DOCKER_NAME}$|VITE_APP_NAME=${VITE_APP_NAME}|g" \
                "$temp_file"
        else
            # Linux
            sed -i \
                -e "s|^VITE_APP_NAME=${CURRENT_VITE_APP_NAME}$|VITE_APP_NAME=${VITE_APP_NAME}|g" \
                -e "s|^VITE_APP_NAME=financial-win-App$|VITE_APP_NAME=${VITE_APP_NAME}|g" \
                -e "s|^VITE_APP_NAME=financial-win-app$|VITE_APP_NAME=${VITE_APP_NAME}|g" \
                -e "s|^VITE_APP_NAME=${CURRENT_DOCKER_NAME}$|VITE_APP_NAME=${VITE_APP_NAME}|g" \
                "$temp_file"
        fi
        
        # Reemplazar el archivo original con el modificado
        mv "$temp_file" "$env_file"
        
        # Contar el archivo solo una vez
        if [[ ! "$PROCESSED_FILES" =~ "|$env_file|" ]]; then
            PROCESSED_FILES="${PROCESSED_FILES}|$env_file|"
            CHANGES=$((CHANGES + 1))
            echo -e "${GREEN}✓ Actualizado: ${env_file}${NC}"
        fi
    }
    
    # Procesar archivo .env.example del API (solo variables específicas)
    process_api_env_example
    
    # Procesar archivo .env.example del Web (solo VITE_APP_NAME)
    process_web_env_example
    

# Cambiar nombre en package.json y lugares relacionados
echo -e "${YELLOW}Actualizando package.json y referencias...${NC}"
    
    # package.json root
    if [ -f "package.json" ]; then
        # Cambiar nombre
        replace_in_file "package.json" "\"name\": \"${CURRENT_PACKAGE_NAME}\"" "\"name\": \"${NEW_PACKAGE_NAME}\""
        # Cambiar descripción si contiene el nombre antiguo
        replace_in_file "package.json" "${CURRENT_PACKAGE_NAME} -" "${NEW_PACKAGE_NAME} -"
        replace_in_file "package.json" "${CURRENT_PACKAGE_NAME}" "${NEW_PACKAGE_NAME}"
    fi
    
    # README.md - título y referencias
    if [ -f "README.md" ]; then
        # Título principal
        replace_in_file "README.md" "# ${CURRENT_PACKAGE_NAME}" "# ${NEW_PACKAGE_NAME}"
        replace_in_file "README.md" "# financial-win Project" "# ${NEW_PACKAGE_NAME}"
        # Referencias en texto
        replace_in_file "README.md" "financial-win-project/" "${NEW_PACKAGE_NAME}/"
        replace_in_file "README.md" "mi-nuevo-proyecto" "${NEW_PACKAGE_NAME}"
        replace_in_file "README.md" "Este financial-win" "Esta aplicación"
        replace_in_file "README.md" "este financial-win" "esta aplicación"
    fi
    
    # Archivos .mdc
    for doc_file in mdc/*.mdc; do
        if [ -f "$doc_file" ]; then
            replace_in_file "$doc_file" "financial-win-project/" "${NEW_PACKAGE_NAME}/"
            replace_in_file "$doc_file" "Este financial-win" "Esta aplicación"
            replace_in_file "$doc_file" "este financial-win" "esta aplicación"
        fi
    done
    
    # main.ts - Título de Swagger
    if [ -f "apps/api/src/main.ts" ]; then
        replace_in_file "apps/api/src/main.ts" ".setTitle('financial-win API')" ".setTitle('${NEW_PACKAGE_NAME} API')"
        replace_in_file "apps/api/src/main.ts" ".setTitle(\"financial-win API\")" ".setTitle(\"${NEW_PACKAGE_NAME} API\")"
    fi
    
    # package.json de apps/api y apps/web - descripciones
    if [ -f "apps/api/package.json" ]; then
        replace_in_file "apps/api/package.json" "financial-win API" "${NEW_PACKAGE_NAME} API"
        replace_in_file "apps/api/package.json" "financial-win Team" "${NEW_PACKAGE_NAME} Team"
    fi
    
    if [ -f "apps/web/package.json" ]; then
        replace_in_file "apps/web/package.json" "financial-win Web" "${NEW_PACKAGE_NAME} Web"
    fi

echo ""
echo -e "${GREEN}✅ Cambio completado exitosamente${NC}"
echo -e "${BLUE}📊 Resumen:${NC}"
echo -e "  - Archivos modificados: ${CHANGES}"
echo ""

echo -e "${YELLOW}⚠️  Recordatorios:${NC}"
echo -e "  1. ${RED}IMPORTANTE:${NC} Si tienes contenedores corriendo, deténlos primero:"
echo -e "     ${CYAN}docker compose -f docker-compose.dev.yml down${NC}"
echo -e "     ${CYAN}docker compose -f docker-compose.prod.yml down${NC} (si aplica)"
echo -e "  2. ${RED}IMPORTANTE:${NC} Si tienes datos en la base de datos anterior, necesitarás migrarlos manualmente"
echo -e "     Los volúmenes de Docker mantendrán el nombre antiguo, considera renombrarlos:"
if [ -n "$CURRENT_PROJECT_NAME" ] && [ "$CURRENT_PROJECT_NAME" != "$NEW_DOCKER_NAME" ]; then
    echo -e "     ${CYAN}docker volume rename ${CURRENT_PROJECT_NAME}_postgres_data ${NEW_DOCKER_NAME}_postgres_data${NC}"
fi
echo -e "     ${CYAN}docker volume rename financial-win_postgres_data ${NEW_DOCKER_NAME}_postgres_data${NC} (si aplica)"
echo -e "     ${CYAN}docker volume rename ${CURRENT_DOCKER_NAME}_postgres_data ${NEW_DOCKER_NAME}_postgres_data${NC} (si aplica)"
echo -e "  3. ${BLUE}IMPORTANTE:${NC} El nombre del proyecto Docker Compose se ha actualizado en .env"
echo -e "     Los nuevos volúmenes y redes usarán el prefijo: ${NEW_DOCKER_NAME}"
echo -e "     Los volúmenes se crearán como: ${NEW_DOCKER_NAME}_postgres_data"
echo -e "     Las redes se crearán como: ${NEW_DOCKER_NAME}_network"
echo -e "     Si usas COMPOSE_PROJECT_NAME, asegúrate de exportarlo:"
echo -e "     ${CYAN}export COMPOSE_PROJECT_NAME=${NEW_DOCKER_NAME}${NC}"
echo -e "  4. Los nuevos contenedores se crearán con los nuevos nombres al ejecutar:"
echo -e "     ${CYAN}./scripts/dev.sh${NC}"
echo -e "  5. Ejecuta ${CYAN}pnpm install${NC} para actualizar las dependencias del workspace"
echo -e "  6. Verifica que no queden referencias al nombre antiguo:"
echo -e "     ${CYAN}grep -r '${CURRENT_DOCKER_NAME}' . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git${NC}"
echo -e "     ${CYAN}grep -r '${CURRENT_PACKAGE_NAME}' . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git${NC}"
echo -e "     ${CYAN}grep -r 'financial-win' . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git | grep -i docker${NC}"
echo ""

