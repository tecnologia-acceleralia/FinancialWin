#!/bin/bash

# OIDC Server Development Setup Script
# This script provides all commands for managing the OIDC server Docker environment

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service ports (matching docker-compose.yml)
FRONTEND_PORT=3008
BACKEND_PORT=4009
PROVIDER_PORT=5009
POSTGRES_PORT=5437

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
}

# Function to show help
show_help() {
    echo -e "${GREEN}Sistema OIDC Local - Comandos disponibles:${NC}"
    echo ""
    echo "  ${YELLOW}up${NC}              - Levantar todos los servicios"
    echo "  ${YELLOW}down${NC}            - Parar todos los servicios"
    echo "  ${YELLOW}restart${NC}         - Reiniciar todos los servicios"
    echo "  ${YELLOW}logs${NC}            - Ver logs en tiempo real (todos los servicios)"
    echo "  ${YELLOW}logs-provider${NC}   - Ver logs solo del provider"
    echo "  ${YELLOW}logs-backend${NC}    - Ver logs solo del backend"
    echo "  ${YELLOW}logs-frontend${NC}   - Ver logs solo del frontend"
    echo "  ${YELLOW}logs-postgres${NC}   - Ver logs solo de postgres"
    echo "  ${YELLOW}status${NC}          - Mostrar estado de los servicios"
    echo "  ${YELLOW}test${NC}            - Ejecutar tests básicos"
    echo "  ${YELLOW}build${NC}           - Construir imágenes sin levantar"
    echo "  ${YELLOW}clean${NC}          - Limpiar volúmenes y base de datos"
    echo "  ${YELLOW}sh-provider${NC}    - Acceder al shell del contenedor provider"
    echo "  ${YELLOW}sh-backend${NC}     - Acceder al shell del contenedor backend"
    echo "  ${YELLOW}seed${NC}            - Mostrar información de usuarios de prueba"
    echo "  ${YELLOW}dev-setup${NC}      - Configurar entorno de desarrollo"
    echo "  ${YELLOW}install-deps${NC}   - Instalar dependencias localmente"
    echo "  ${YELLOW}dev-provider${NC}   - Ejecutar provider en modo desarrollo (sin Docker)"
    echo "  ${YELLOW}dev-backend${NC}    - Ejecutar backend en modo desarrollo (sin Docker)"
    echo "  ${YELLOW}robust${NC}         - Reinstalación robusta: elimina node_modules y pnpm-lock.yaml, reinstala todo"
    echo "  ${YELLOW}help${NC}            - Mostrar esta ayuda"
    echo ""
    echo -e "${GREEN}Puertos del sistema:${NC}"
    echo "  Frontend:  http://localhost:${FRONTEND_PORT}"
    echo "  Backend:   http://localhost:${BACKEND_PORT}"
    echo "  Provider:  http://localhost:${PROVIDER_PORT}"
    echo "  Postgres:  localhost:${POSTGRES_PORT}"
    echo ""
}

# Function to stop existing containers
cleanup() {
    print_info "Cleaning up existing containers..."
    docker compose down > /dev/null 2>&1 || true
    print_status "Cleanup completed"
}

# Function to build and start services
start_services() {
    print_info "Building and starting OIDC services..."
    echo ""
    
    # Build and start all services
    docker compose up --build -d
    
    print_status "Services started successfully!"
    echo ""
}

# Function to wait for services to be ready
wait_for_services() {
    print_info "Waiting for services to be ready..."
    
    # Wait for provider
    print_info "Waiting for Provider (port ${PROVIDER_PORT})..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -s http://localhost:${PROVIDER_PORT}/health > /dev/null 2>&1; then
            print_status "Provider is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_warning "Provider health check timeout"
    fi
    
    # Wait for backend
    print_info "Waiting for Backend (port ${BACKEND_PORT})..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -s http://localhost:${BACKEND_PORT}/health > /dev/null 2>&1; then
            print_status "Backend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_warning "Backend health check timeout"
    fi
    
    # Wait for frontend
    print_info "Waiting for Frontend (port ${FRONTEND_PORT})..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if curl -s http://localhost:${FRONTEND_PORT}/ > /dev/null 2>&1; then
            print_status "Frontend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_warning "Frontend health check timeout"
    fi
}

# Function to show service status
show_status() {
    echo ""
    print_info "Service Status:"
    echo ""
    docker compose ps
    echo ""
    
    print_info "Service URLs:"
    echo "  🌐 Frontend:  http://localhost:${FRONTEND_PORT}"
    echo "  🔧 Backend:   http://localhost:${BACKEND_PORT}"
    echo "  🔐 Provider:  http://localhost:${PROVIDER_PORT}"
    echo ""
    
    print_info "Health Checks:"
    curl -s http://localhost:${PROVIDER_PORT}/health > /dev/null 2>&1 && echo "  ✅ Provider: OK" || echo "  ❌ Provider: ERROR"
    curl -s http://localhost:${BACKEND_PORT}/health > /dev/null 2>&1 && echo "  ✅ Backend: OK" || echo "  ❌ Backend: ERROR"
    curl -s http://localhost:${FRONTEND_PORT}/ > /dev/null 2>&1 && echo "  ✅ Frontend: OK" || echo "  ❌ Frontend: ERROR"
    curl -s http://localhost:${PROVIDER_PORT}/admin-panel/ > /dev/null 2>&1 && echo "  ✅ Admin Panel: OK" || echo "  ❌ Admin Panel: ERROR"
    echo ""
    
    print_info "Test URLs:"
    echo "  📋 Provider metadata: http://localhost:${PROVIDER_PORT}/.well-known/openid-configuration"
    echo "  🏥 Provider health:   http://localhost:${PROVIDER_PORT}/health"
    echo "  🏥 Backend health:    http://localhost:${BACKEND_PORT}/health"
    echo ""
}

# Function to show logs
show_logs() {
    local service="${1:-}"
    if [ -z "$service" ]; then
        print_info "Showing logs for all services (press Ctrl+C to exit)..."
        docker compose logs -f --tail=100
    else
        print_info "Showing logs for $service (press Ctrl+C to exit)..."
        docker compose logs -f "$service" --tail=100
    fi
}

# Function to run tests
run_tests() {
    print_info "🧪 Ejecutando tests básicos..."
    echo ""
    echo "Probando Provider..."
    curl -s http://localhost:${PROVIDER_PORT}/.well-known/openid-configuration > /dev/null && echo "✅ Provider metadata: OK" || echo "❌ Provider metadata: ERROR"
    echo "Probando Backend..."
    curl -s http://localhost:${BACKEND_PORT}/api/info > /dev/null && echo "✅ Backend info: OK" || echo "❌ Backend info: ERROR"
    echo "Probando Frontend..."
    curl -s http://localhost:${FRONTEND_PORT}/ > /dev/null && echo "✅ Frontend: OK" || echo "❌ Frontend: ERROR"
    echo "Probando Admin Panel..."
    curl -s http://localhost:${PROVIDER_PORT}/admin-panel/ > /dev/null && echo "✅ Admin Panel: OK" || echo "❌ Admin Panel: ERROR"
    echo ""
}

# Function to setup development environment
dev_setup() {
    print_info "⚙️ Configurando entorno de desarrollo..."
    if [ ! -f .env ]; then
        echo "NODE_ENV=development" > .env
        echo "SESSION_SECRET=dev_super_secret_change_me_in_production" >> .env
        echo "TRUST_PROXY=0" >> .env
        print_status "Archivo .env creado"
    else
        print_warning "Archivo .env ya existe"
    fi
}

# Function to check if pnpm is installed
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm no está instalado. Por favor instálalo con: npm install -g pnpm"
        exit 1
    fi
    print_status "pnpm está disponible"
}

# Function to install dependencies locally
install_deps() {
    check_pnpm
    print_info "📦 Instalando dependencias con pnpm..."
    cd provider && pnpm install
    cd ../backend && pnpm install
    print_status "Dependencias instaladas"
}

# Function to robustly reinstall all dependencies
robust_install() {
    check_pnpm
    print_warning "🧹 Reinstalación robusta de dependencias..."
    echo ""
    
    # Provider
    print_info "Limpiando provider..."
    cd provider
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        print_status "node_modules eliminado en provider"
    fi
    if [ -f "pnpm-lock.yaml" ]; then
        rm -f pnpm-lock.yaml
        print_status "pnpm-lock.yaml eliminado en provider"
    fi
    print_info "Instalando dependencias del provider con pnpm..."
    pnpm install
    print_status "Provider: Dependencias reinstaladas"
    cd ..
    
    # Backend
    print_info "Limpiando backend..."
    cd backend
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        print_status "node_modules eliminado en backend"
    fi
    if [ -f "pnpm-lock.yaml" ]; then
        rm -f pnpm-lock.yaml
        print_status "pnpm-lock.yaml eliminado en backend"
    fi
    print_info "Instalando dependencias del backend con pnpm..."
    pnpm install
    print_status "Backend: Dependencias reinstaladas"
    cd ..
    
    echo ""
    print_status "✅ Reinstalación robusta completada"
    print_info "Los archivos pnpm-lock.yaml han sido regenerados con las últimas dependencias"
}

# Function to show seed users info
show_seed() {
    print_info "👥 Los usuarios de prueba se crean automáticamente al iniciar"
    echo "Usuarios disponibles:"
    echo "  • alice@example.com / password123"
    echo "  • bob@example.com / password456"
    echo ""
}

# Main execution (when no command is provided)
main() {
    echo -e "${BLUE}"
    echo "🚀 OIDC Server Development Setup"
    echo "================================"
    echo -e "${NC}"
    
    # Check prerequisites
    check_docker
    
    # Cleanup existing containers
    cleanup
    
    # Start services
    start_services
    
    # Wait for services
    wait_for_services
    
    # Show status
    show_status
    
    print_status "Development environment is ready!"
    echo ""
    print_info "Useful commands:"
    echo "  📋 View logs:     ./dev.sh logs"
    echo "  🛑 Stop services: ./dev.sh stop"
    echo "  🔄 Restart:       ./dev.sh restart"
    echo "  🧹 Clean up:      ./dev.sh clean"
    echo ""
    
    # Ask if user wants to see logs
    read -p "Would you like to view the logs now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        show_logs
    fi
}

# Handle command line arguments
case "${1:-}" in
    "up")
        check_docker
        start_services
        wait_for_services
        show_status
        print_status "Sistema iniciado. Accede a: http://localhost:${FRONTEND_PORT}"
        ;;
    "down"|"stop")
        print_info "Parando sistema OIDC..."
        docker compose down
        print_status "Sistema detenido"
        ;;
    "restart")
        print_info "Reiniciando sistema OIDC..."
        docker compose restart
        print_status "Sistema reiniciado"
        ;;
    "logs")
        show_logs
        ;;
    "logs-provider")
        show_logs "provider"
        ;;
    "logs-backend")
        show_logs "backend"
        ;;
    "logs-frontend")
        show_logs "frontend"
        ;;
    "logs-postgres")
        show_logs "postgres"
        ;;
    "status")
        show_status
        ;;
    "test")
        run_tests
        ;;
    "build")
        print_info "Construyendo imágenes..."
        docker compose build
        print_status "Construcción completada"
        ;;
    "clean")
        print_warning "🧹 Limpiando sistema..."
        docker compose down -v
        rm -f provider/users.db 2>/dev/null || true
        print_status "Limpieza completada"
        ;;
    "sh-provider")
        docker compose exec provider sh || print_error "Contenedor provider no disponible"
        ;;
    "sh-backend")
        docker compose exec backend sh || print_error "Contenedor backend no disponible"
        ;;
    "seed")
        show_seed
        ;;
    "dev-setup")
        dev_setup
        ;;
    "install-deps")
        install_deps
        ;;
    "dev-provider")
        print_info "Iniciando provider en modo desarrollo..."
        cd provider && pnpm run dev
        ;;
    "dev-backend")
        print_info "Iniciando backend en modo desarrollo..."
        cd backend && pnpm run dev
        ;;
    "robust")
        robust_install
        ;;
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use './dev.sh help' to see available commands"
        exit 1
        ;;
esac
