#!/bin/bash

# financial-win - Deep Clean Development Environment Script
# This script performs a complete cleanup of the development environment

set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

echo "🧹 Deep Cleaning financial-win Development Environment..."

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

print_step "Stopping all development containers..."
docker-compose -f docker-compose.dev.yml down --remove-orphans

print_step "Removing development containers..."
docker-compose -f docker-compose.dev.yml rm -f

print_step "Removing development images..."
# Remove images built by docker-compose (only if they exist)
if docker images --filter "reference=write-mvp*" -q | grep -q .; then
    docker images --filter "reference=write-mvp*" -q | xargs docker rmi -f
else
    print_warning "No development images found to remove"
fi

print_step "Cleaning up unused Docker resources..."
docker system prune -f

print_step "Removing unused volumes..."
docker volume prune -f

print_step "Removing unused networks..."
docker network prune -f

print_status "✅ Development environment deep cleaned successfully!"
echo ""
echo "📋 What was cleaned:"
echo "  • All development containers stopped and removed"
echo "  • Development images removed"
echo "  • Unused Docker resources cleaned"
echo "  • Unused volumes removed"
echo "  • Unused networks removed"
echo ""
echo "🚀 Ready to run ./scripts/dev.sh for a fresh start!"
echo ""
echo "💡 Tip: Use this script when you encounter:"
echo "  • Port conflicts"
echo "  • Stale containers"
echo "  • Docker resource issues"
echo "  • Need a completely fresh environment"
