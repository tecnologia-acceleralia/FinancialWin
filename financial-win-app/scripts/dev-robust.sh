#!/bin/bash

# financial-win - ROBUST Development Setup Script
# This script ensures dependencies are always properly installed

set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

echo "🚀 Setting up financial-win Development Environment (ROBUST MODE)..."

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

# Generate cache bust timestamp
CACHE_BUST=$(date +%s)
print_step "Using cache bust timestamp: $CACHE_BUST"

# Stop existing containers
print_step "Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Remove old API image to force rebuild
print_step "Removing old API image to force rebuild..."
docker rmi write-mvp-api:latest 2>/dev/null || true

# Start PostgreSQL first
print_step "Starting PostgreSQL database..."
docker-compose -f docker-compose.dev.yml up -d postgres

print_status "Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker exec financial-win-postgres-dev pg_isready -U financial-win -d financial-win_dev; do
    print_warning "Waiting for PostgreSQL to be ready..."
    sleep 2
done

print_status "PostgreSQL is ready!"

# Build API with cache busting
print_step "Building API with cache busting (CACHE_BUST=$CACHE_BUST)..."
docker-compose -f docker-compose.dev.yml build --no-cache --build-arg CACHE_BUST=$CACHE_BUST api

# Start API
print_step "Starting API..."
docker-compose -f docker-compose.dev.yml up -d api

# Build and start Web frontend
print_step "Building and starting Web frontend..."
docker-compose -f docker-compose.dev.yml up -d web

# Start Adminer
print_step "Starting Adminer (Database Admin Tool)..."
docker-compose -f docker-compose.dev.yml up -d adminer

print_status "Waiting for services to be ready..."
sleep 15

# Health checks
print_step "Checking API health..."
if curl -f http://localhost:6000/health > /dev/null 2>&1; then
    print_status "✅ API is healthy"
else
    print_warning "⚠️ API health check failed"
fi

print_step "Checking Web health..."
if curl -f http://localhost:3014/health > /dev/null 2>&1; then
    print_status "✅ Web frontend is healthy"
else
    print_warning "⚠️ Web frontend health check failed"
fi

# Verify dependencies are installed
print_step "Verifying dependencies in API container..."
if docker exec financial-win-api-dev ls node_modules/@nestjs/jwt > /dev/null 2>&1; then
    print_status "✅ @nestjs/jwt is installed"
else
    print_error "❌ @nestjs/jwt is NOT installed"
fi

if docker exec financial-win-api-dev ls node_modules/@aws-sdk/client-s3 > /dev/null 2>&1; then
    print_status "✅ @aws-sdk/client-s3 is installed"
else
    print_error "❌ @aws-sdk/client-s3 is NOT installed"
fi

if docker exec financial-win-api-dev ls node_modules/@aws-sdk/s3-request-presigner > /dev/null 2>&1; then
    print_status "✅ @aws-sdk/s3-request-presigner is installed"
else
    print_error "❌ @aws-sdk/s3-request-presigner is NOT installed"
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
echo "  - Database shell: docker exec -it financial-win-postgres-dev psql -U financial-win -d financial-win_dev"
echo ""
echo "🛠️ For dependency issues, use: ./scripts/dev-robust.sh"
