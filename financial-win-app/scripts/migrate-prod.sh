#!/bin/bash

# financial-win - Production Migration Script
# This script handles database migrations in production environments

set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

echo "🚀 financial-win - Production Migration Manager"

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

# Check if we're in production
if [ "$NODE_ENV" != "production" ]; then
    print_warning "NODE_ENV is not set to 'production'. This script is designed for production use."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Migration cancelled."
        exit 1
    fi
fi

# Check required environment variables
print_step "Validating environment variables..."
required_vars=("DATABASE_URL")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables: ${missing_vars[*]}"
    print_error "Please set these variables before running migrations."
    exit 1
fi

print_status "Environment variables validated successfully."

# Check if dist directory exists
if [ ! -d "apps/api/dist" ]; then
    print_error "Dist directory not found. Please build the application first:"
    print_error "  cd apps/api && npm run build"
    exit 1
fi

# Function to run migrations
run_migrations() {
    print_step "Running database migrations..."
    
    cd apps/api
    
    # Show current migration status
    print_status "Current migration status:"
    npm run migration:prod:show
    
    # Run migrations
    if npm run migration:prod; then
        print_status "✅ Migrations completed successfully!"
        
        # Show updated status
        print_status "Updated migration status:"
        npm run migration:prod:show
    else
        print_error "❌ Migration failed!"
        exit 1
    fi
}

# Function to revert last migration
revert_migration() {
    print_step "Reverting last migration..."
    
    cd apps/api
    
    print_warning "This will revert the last applied migration. Are you sure?"
    read -p "Type 'REVERT' to confirm: " -r
    if [ "$REPLY" != "REVERT" ]; then
        print_error "Revert cancelled."
        exit 1
    fi
    
    if npm run migration:prod:revert; then
        print_status "✅ Migration reverted successfully!"
    else
        print_error "❌ Revert failed!"
        exit 1
    fi
}

# Function to show migration status
show_status() {
    print_step "Migration Status:"
    cd apps/api
    npm run migration:prod:show
}

# Main script logic
case "${1:-run}" in
    "run")
        run_migrations
        ;;
    "revert")
        revert_migration
        ;;
    "status")
        show_status
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  run     Run pending migrations (default)"
        echo "  revert  Revert the last migration"
        echo "  status  Show current migration status"
        echo "  help    Show this help message"
        echo ""
        echo "Environment Variables Required:"
        echo "  DATABASE_URL - PostgreSQL connection string"
        echo "  NODE_ENV - Should be 'production'"
        echo ""
        echo "Examples:"
        echo "  $0                    # Run migrations"
        echo "  $0 run               # Run migrations"
        echo "  $0 revert            # Revert last migration"
        echo "  $0 status            # Show migration status"
        ;;
    *)
        print_error "Unknown command: $1"
        print_error "Use '$0 help' for usage information."
        exit 1
        ;;
esac

print_status "🎉 Migration operation completed!"
