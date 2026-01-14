#!/bin/bash

# Script de verificación y configuración de variables de entorno
# para desarrollo local: OIDC Server + Write-mvp Integration

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Rutas base
OIDC_SERVER_DIR="/Users/r1go/Documents/CODE/APPLICA/Acceleralia/oidc-server"
WRITE_MVP_DIR="/Users/r1go/Documents/CODE/APPLICA/Acceleralia/Write-mvp"

# Contadores
PASSED=0
FAILED=0
WARNINGS=0
ISSUES=()

# Función para verificar archivo
check_file() {
    local file=$1
    local name=$2
    local create_example=${3:-false}
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $name existe: $file"
        return 0
    else
        echo -e "${RED}✗${NC} $name NO existe: $file"
        if [ "$create_example" = true ]; then
            echo -e "${YELLOW}  → Se creará archivo .example${NC}"
        fi
        return 1
    fi
}

# Función para verificar variable
check_var() {
    local file=$1
    local var=$2
    local required=${3:-false}
    
    if [ ! -f "$file" ]; then
        if [ "$required" = true ]; then
            ISSUES+=("Archivo no existe: $file (requerido para $var)")
            return 1
        fi
        return 0
    fi
    
    if grep -q "^${var}=" "$file" 2>/dev/null || grep -q "^${var} = " "$file" 2>/dev/null; then
        local value=$(grep "^${var}" "$file" | head -1 | sed 's/^[^=]*=//' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | tr -d '"' | tr -d "'")
        if [ -z "$value" ]; then
            ISSUES+=("$var está presente pero vacía en $file")
            return 2
        else
            # Mostrar solo primeros 60 caracteres para no saturar
            local display_value="${value:0:60}"
            [ ${#value} -gt 60 ] && display_value="${display_value}..."
            echo -e "${GREEN}✓${NC}   $var = ${display_value}"
            return 0
        fi
    else
        if [ "$required" = true ]; then
            ISSUES+=("$var NO está presente en $file (REQUERIDA)")
            return 1
        else
            echo -e "${YELLOW}⚠${NC}   $var NO está presente (opcional)"
            return 2
        fi
    fi
}

# Función para extraer valor de variable
get_var_value() {
    local file=$1
    local var=$2
    
    if [ ! -f "$file" ]; then
        echo ""
        return
    fi
    
    local value=$(grep "^${var}" "$file" 2>/dev/null | head -1 | sed 's/^[^=]*=//' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | tr -d '"' | tr -d "'")
    echo "$value"
}

# Función para validar URL
validate_url() {
    local url=$1
    local name=$2
    
    if [[ ! "$url" =~ ^https?:// ]]; then
        ISSUES+=("$name no es una URL válida (debe empezar con http:// o https://): $url")
        return 1
    fi
    return 0
}

# Función para validar consistencia de credenciales
check_credentials_consistency() {
    echo ""
    echo -e "${BLUE}📋 Validación de Consistencia de Credenciales OIDC${NC}"
    echo "────────────────────────────────────────────────────"
    
    local backend_client_id=$(get_var_value "$OIDC_SERVER_DIR/backend/.env" "OIDC_CLIENT_ID")
    local write_api_client_id=$(get_var_value "$WRITE_MVP_DIR/apps/api/.env.dev" "OIDC_CLIENT_ID")
    
    local backend_client_secret=$(get_var_value "$OIDC_SERVER_DIR/backend/.env" "OIDC_CLIENT_SECRET")
    local write_api_client_secret=$(get_var_value "$WRITE_MVP_DIR/apps/api/.env.dev" "OIDC_CLIENT_SECRET")
    
    if [ -n "$backend_client_id" ] && [ -n "$write_api_client_id" ]; then
        if [ "$backend_client_id" = "$write_api_client_id" ]; then
            echo -e "${GREEN}✓${NC} OIDC_CLIENT_ID coincide entre archivos: $backend_client_id"
            PASSED=$((PASSED+1))
        else
            ISSUES+=("OIDC_CLIENT_ID NO coincide: backend=$backend_client_id, write-mvp=$write_api_client_id")
            FAILED=$((FAILED+1))
        fi
    fi
    
    if [ -n "$backend_client_secret" ] && [ -n "$write_api_client_secret" ]; then
        if [ "$backend_client_secret" = "$write_api_client_secret" ]; then
            echo -e "${GREEN}✓${NC} OIDC_CLIENT_SECRET coincide entre archivos"
            PASSED=$((PASSED+1))
        else
            ISSUES+=("OIDC_CLIENT_SECRET NO coincide entre archivos")
            FAILED=$((FAILED+1))
        fi
    fi
}

# Función para validar URLs
validate_urls() {
    echo ""
    echo -e "${BLUE}📋 Validación de URLs${NC}"
    echo "────────────────────────────────────────────────────"
    
    local provider_url=$(get_var_value "$OIDC_SERVER_DIR/provider/.env" "PROVIDER_URL")
    local backend_provider_url=$(get_var_value "$OIDC_SERVER_DIR/backend/.env" "PROVIDER_EXTERNAL_URL")
    local write_api_public_url=$(get_var_value "$WRITE_MVP_DIR/apps/api/.env.dev" "OIDC_PUBLIC_URL")
    
    if [ -n "$provider_url" ]; then
        validate_url "$provider_url" "PROVIDER_URL"
        if [ "$provider_url" = "http://localhost:5009" ]; then
            echo -e "${GREEN}✓${NC} PROVIDER_URL es correcta para desarrollo local: $provider_url"
            PASSED=$((PASSED+1))
        else
            ISSUES+=("PROVIDER_URL debería ser http://localhost:5009 para desarrollo local (actual: $provider_url)")
            WARNINGS=$((WARNINGS+1))
        fi
    fi
    
    if [ -n "$backend_provider_url" ] && [ -n "$provider_url" ]; then
        if [ "$backend_provider_url" = "$provider_url" ]; then
            echo -e "${GREEN}✓${NC} PROVIDER_EXTERNAL_URL coincide con PROVIDER_URL: $backend_provider_url"
            PASSED=$((PASSED+1))
        else
            ISSUES+=("PROVIDER_EXTERNAL_URL ($backend_provider_url) NO coincide con PROVIDER_URL ($provider_url)")
            FAILED=$((FAILED+1))
        fi
    fi
    
    if [ -n "$write_api_public_url" ] && [ -n "$provider_url" ]; then
        if [ "$write_api_public_url" = "$provider_url" ]; then
            echo -e "${GREEN}✓${NC} OIDC_PUBLIC_URL coincide con PROVIDER_URL: $write_api_public_url"
            PASSED=$((PASSED+1))
        else
            ISSUES+=("OIDC_PUBLIC_URL ($write_api_public_url) NO coincide con PROVIDER_URL ($provider_url)")
            FAILED=$((FAILED+1))
        fi
    fi
}

# Función para validar DATABASE_URL
validate_database_urls() {
    echo ""
    echo -e "${BLUE}📋 Validación de URLs de Base de Datos${NC}"
    echo "────────────────────────────────────────────────────"
    
    local provider_db=$(get_var_value "$OIDC_SERVER_DIR/provider/.env" "DATABASE_URL")
    local write_api_db=$(get_var_value "$WRITE_MVP_DIR/apps/api/.env.dev" "DATABASE_URL")
    
    if [ -n "$provider_db" ]; then
        if [[ "$provider_db" =~ localhost:5437 ]] || [[ "$provider_db" =~ :5437/ ]]; then
            echo -e "${GREEN}✓${NC} DATABASE_URL de provider apunta al puerto correcto (5437): $provider_db"
            PASSED=$((PASSED+1))
        else
            ISSUES+=("DATABASE_URL de provider debería apuntar a localhost:5437 (actual: $provider_db)")
            WARNINGS=$((WARNINGS+1))
        fi
    fi
    
    if [ -n "$write_api_db" ]; then
        if [[ "$write_api_db" =~ :5432/ ]] || [[ "$write_api_db" =~ postgres:5432 ]]; then
            echo -e "${GREEN}✓${NC} DATABASE_URL de write-mvp apunta al puerto correcto (5432): $write_api_db"
            PASSED=$((PASSED+1))
        else
            ISSUES+=("DATABASE_URL de write-mvp debería apuntar a puerto 5432 (actual: $write_api_db)")
            WARNINGS=$((WARNINGS+1))
        fi
    fi
}

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  VERIFICACIÓN DE VARIABLES DE ENTORNO - DESARROLLO LOCAL${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# ============================================
# 1. OIDC SERVER - PROVIDER
# ============================================
echo -e "${CYAN}📋 1. OIDC SERVER - PROVIDER (.env)${NC}"
echo "────────────────────────────────────────────────────"

PROVIDER_ENV="$OIDC_SERVER_DIR/provider/.env"

if check_file "$PROVIDER_ENV" "provider/.env" true; then
    check_var "$PROVIDER_ENV" "PROVIDER_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$PROVIDER_ENV" "DATABASE_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$PROVIDER_ENV" "NODE_ENV" false && PASSED=$((PASSED+1)) || WARNINGS=$((WARNINGS+1))
    check_var "$PROVIDER_ENV" "PORT" false && PASSED=$((PASSED+1)) || WARNINGS=$((WARNINGS+1))
else
    FAILED=$((FAILED+2))
    WARNINGS=$((WARNINGS+2))
fi

echo ""

# ============================================
# 2. OIDC SERVER - BACKEND
# ============================================
echo -e "${CYAN}📋 2. OIDC SERVER - BACKEND (.env)${NC}"
echo "────────────────────────────────────────────────────"

BACKEND_ENV="$OIDC_SERVER_DIR/backend/.env"

if check_file "$BACKEND_ENV" "backend/.env" true; then
    check_var "$BACKEND_ENV" "PROVIDER_EXTERNAL_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$BACKEND_ENV" "OIDC_CLIENT_ID" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$BACKEND_ENV" "OIDC_CLIENT_SECRET" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$BACKEND_ENV" "OIDC_CALLBACK_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$BACKEND_ENV" "FRONTEND_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$BACKEND_ENV" "BACKEND_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$BACKEND_ENV" "SESSION_SECRET" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
else
    FAILED=$((FAILED+7))
fi

echo ""

# ============================================
# 3. WRITE-MVP - API
# ============================================
echo -e "${CYAN}📋 3. WRITE-MVP - API (.env.dev)${NC}"
echo "────────────────────────────────────────────────────"

WRITE_API_ENV="$WRITE_MVP_DIR/apps/api/.env.dev"

if check_file "$WRITE_API_ENV" "apps/api/.env.dev" true; then
    check_var "$WRITE_API_ENV" "OIDC_ISSUER_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$WRITE_API_ENV" "OIDC_PUBLIC_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$WRITE_API_ENV" "OIDC_CLIENT_ID" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$WRITE_API_ENV" "OIDC_CLIENT_SECRET" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$WRITE_API_ENV" "OIDC_REDIRECT_URI" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$WRITE_API_ENV" "OIDC_POST_LOGOUT_REDIRECT_URI" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$WRITE_API_ENV" "OIDC_SCOPES" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$WRITE_API_ENV" "OIDC_COOKIE_NAME" false && PASSED=$((PASSED+1)) || WARNINGS=$((WARNINGS+1))
    check_var "$WRITE_API_ENV" "OIDC_COOKIE_SECURE" false && PASSED=$((PASSED+1)) || WARNINGS=$((WARNINGS+1))
    check_var "$WRITE_API_ENV" "OIDC_COOKIE_SAME_SITE" false && PASSED=$((PASSED+1)) || WARNINGS=$((WARNINGS+1))
    check_var "$WRITE_API_ENV" "DATABASE_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$WRITE_API_ENV" "PORT" false && PASSED=$((PASSED+1)) || WARNINGS=$((WARNINGS+1))
    check_var "$WRITE_API_ENV" "NODE_ENV" false && PASSED=$((PASSED+1)) || WARNINGS=$((WARNINGS+1))
else
    FAILED=$((FAILED+7))
    WARNINGS=$((WARNINGS+5))
fi

echo ""

# ============================================
# 4. WRITE-MVP - WEB
# ============================================
echo -e "${CYAN}📋 4. WRITE-MVP - WEB (.env.dev)${NC}"
echo "────────────────────────────────────────────────────"

WRITE_WEB_ENV="$WRITE_MVP_DIR/apps/web/.env.dev"

if check_file "$WRITE_WEB_ENV" "apps/web/.env.dev" true; then
    check_var "$WRITE_WEB_ENV" "VITE_API_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
    check_var "$WRITE_WEB_ENV" "VITE_FRONTEND_URL" true && PASSED=$((PASSED+1)) || FAILED=$((FAILED+1))
else
    FAILED=$((FAILED+2))
fi

echo ""

# ============================================
# Validaciones adicionales
# ============================================
check_credentials_consistency
validate_urls
validate_database_urls

# ============================================
# Resumen
# ============================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  RESUMEN${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Exitosas:${NC} $PASSED"
echo -e "${RED}✗ Fallidas:${NC} $FAILED"
echo -e "${YELLOW}⚠ Advertencias:${NC} $WARNINGS"
echo ""

if [ ${#ISSUES[@]} -gt 0 ]; then
    echo -e "${RED}❌ Problemas encontrados:${NC}"
    for issue in "${ISSUES[@]}"; do
        echo -e "  ${RED}•${NC} $issue"
    done
    echo ""
fi

if [ $FAILED -eq 0 ] && [ ${#ISSUES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Todas las verificaciones críticas pasaron${NC}"
    exit 0
else
    echo -e "${RED}❌ Se encontraron errores críticos${NC}"
    echo ""
    echo -e "${YELLOW}💡 Siguiente paso:${NC}"
    echo "  1. Revisa los problemas listados arriba"
    echo "  2. Copia los archivos .env.example a .env y ajusta los valores"
    echo "  3. Ejecuta este script nuevamente para verificar"
    exit 1
fi
