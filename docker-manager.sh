#!/bin/bash

# Script para gerenciar o ServerAdmin com Docker

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${GREEN}[ServerAdmin]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função de ajuda
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development environment"
    echo "  prod        Start production environment"
    echo "  build       Build all images"
    echo "  stop        Stop all containers"
    echo "  down        Stop and remove all containers"
    echo "  logs        Show logs for all services"
    echo "  clean       Clean up Docker resources"
    echo "  backup      Backup database"
    echo "  restore     Restore database from backup"
    echo "  health      Check health of all services"
    echo ""
    echo "Options:"
    echo "  -f, --follow    Follow logs (use with logs command)"
    echo "  -h, --help      Show this help message"
}

# Verificar se Docker está rodando
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Função para desenvolvimento
start_dev() {
    print_message "Starting development environment..."
    check_docker
    
    # Build images se necessário
    docker-compose -f docker-compose.dev.yml build
    
    # Start services
    docker-compose -f docker-compose.dev.yml up -d
    
    print_message "Development environment started!"
    print_message "Frontend: http://localhost:4200"
    print_message "Backend API: http://localhost:8000"
    print_message "API Docs: http://localhost:8000/docs"
}

# Função para produção
start_prod() {
    print_message "Starting production environment..."
    check_docker
    
    # Verificar se existe arquivo .env
    if [ ! -f .env ]; then
        print_warning "No .env file found. Creating template..."
        cat > .env << EOF
SECRET_KEY=your-super-secret-key-change-this
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_PASSWORD=your-secure-redis-password
EOF
        print_warning "Please edit .env file with your production secrets!"
        exit 1
    fi
    
    # Build images
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
    
    # Start services
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
    
    print_message "Production environment started!"
    print_message "Application: https://localhost"
}

# Build images
build_images() {
    print_message "Building Docker images..."
    check_docker
    
    docker-compose build --no-cache
    docker-compose -f docker-compose.dev.yml build --no-cache
    
    print_message "Images built successfully!"
}

# Stop containers
stop_containers() {
    print_message "Stopping containers..."
    docker-compose stop
    docker-compose -f docker-compose.dev.yml stop
    docker-compose -f docker-compose.prod.yml stop
    print_message "Containers stopped!"
}

# Remove containers
down_containers() {
    print_message "Stopping and removing containers..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.prod.yml down
    print_message "Containers removed!"
}

# Show logs
show_logs() {
    local follow_flag=""
    if [[ "$1" == "--follow" || "$1" == "-f" ]]; then
        follow_flag="-f"
    fi
    
    print_message "Showing logs..."
    docker-compose logs $follow_flag
}

# Clean Docker resources
clean_docker() {
    print_message "Cleaning Docker resources..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    print_message "Docker cleanup completed!"
}

# Backup database
backup_db() {
    print_message "Creating database backup..."
    
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    docker-compose exec postgres pg_dump -U admin server_admin > "backups/$backup_file"
    
    print_message "Backup created: backups/$backup_file"
}

# Restore database
restore_db() {
    if [ -z "$1" ]; then
        print_error "Please specify backup file: $0 restore <backup_file>"
        exit 1
    fi
    
    print_message "Restoring database from $1..."
    
    docker-compose exec -T postgres psql -U admin -d server_admin < "$1"
    
    print_message "Database restored successfully!"
}

# Health check
health_check() {
    print_message "Checking service health..."
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        print_message "✓ Containers are running"
    else
        print_error "✗ Some containers are not running"
    fi
    
    # Check backend health
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        print_message "✓ Backend is healthy"
    else
        print_warning "✗ Backend health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost:4200 >/dev/null 2>&1; then
        print_message "✓ Frontend is accessible"
    else
        print_warning "✗ Frontend is not accessible"
    fi
}

# Main script logic
case "$1" in
    "dev")
        start_dev
        ;;
    "prod")
        start_prod
        ;;
    "build")
        build_images
        ;;
    "stop")
        stop_containers
        ;;
    "down")
        down_containers
        ;;
    "logs")
        show_logs "$2"
        ;;
    "clean")
        clean_docker
        ;;
    "backup")
        backup_db
        ;;
    "restore")
        restore_db "$2"
        ;;
    "health")
        health_check
        ;;
    "-h"|"--help"|"help")
        show_help
        ;;
    "")
        print_error "No command specified. Use -h for help."
        exit 1
        ;;
    *)
        print_error "Unknown command: $1. Use -h for help."
        exit 1
        ;;
esac
