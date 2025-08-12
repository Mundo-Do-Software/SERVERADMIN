@echo off
REM Script PowerShell para gerenciar o ServerAdmin com Docker

setlocal enabledelayedexpansion

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "NC=[0m"

:print_message
echo %GREEN%[ServerAdmin]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:show_help
echo Usage: %~nx0 [COMMAND] [OPTIONS]
echo.
echo Commands:
echo   dev         Start development environment
echo   prod        Start production environment
echo   build       Build all images
echo   stop        Stop all containers
echo   down        Stop and remove all containers
echo   logs        Show logs for all services
echo   clean       Clean up Docker resources
echo   backup      Backup database
echo   restore     Restore database from backup
echo   health      Check health of all services
echo.
echo Options:
echo   -f, --follow    Follow logs (use with logs command)
echo   -h, --help      Show this help message
goto :eof

:check_docker
docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not running. Please start Docker first."
    exit /b 1
)
goto :eof

:start_dev
call :print_message "Starting development environment..."
call :check_docker
if errorlevel 1 exit /b 1

docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d

call :print_message "Development environment started!"
call :print_message "Frontend: http://localhost:4200"
call :print_message "Backend API: http://localhost:8000"
call :print_message "API Docs: http://localhost:8000/docs"
goto :eof

:start_prod
call :print_message "Starting production environment..."
call :check_docker
if errorlevel 1 exit /b 1

if not exist .env (
    call :print_warning "No .env file found. Creating template..."
    (
        echo SECRET_KEY=your-super-secret-key-change-this
        echo POSTGRES_PASSWORD=your-secure-postgres-password
        echo REDIS_PASSWORD=your-secure-redis-password
    ) > .env
    call :print_warning "Please edit .env file with your production secrets!"
    exit /b 1
)

docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d

call :print_message "Production environment started!"
call :print_message "Application: https://localhost"
goto :eof

:build_images
call :print_message "Building Docker images..."
call :check_docker
if errorlevel 1 exit /b 1

docker-compose build --no-cache
docker-compose -f docker-compose.dev.yml build --no-cache

call :print_message "Images built successfully!"
goto :eof

:stop_containers
call :print_message "Stopping containers..."
docker-compose stop
docker-compose -f docker-compose.dev.yml stop
docker-compose -f docker-compose.prod.yml stop
call :print_message "Containers stopped!"
goto :eof

:down_containers
call :print_message "Stopping and removing containers..."
docker-compose down
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.prod.yml down
call :print_message "Containers removed!"
goto :eof

:show_logs
set "follow_flag="
if "%~2"=="--follow" set "follow_flag=-f"
if "%~2"=="-f" set "follow_flag=-f"

call :print_message "Showing logs..."
docker-compose logs %follow_flag%
goto :eof

:clean_docker
call :print_message "Cleaning Docker resources..."

docker container prune -f
docker image prune -f
docker volume prune -f
docker network prune -f

call :print_message "Docker cleanup completed!"
goto :eof

:backup_db
call :print_message "Creating database backup..."

for /f "tokens=1-4 delims=/ " %%i in ('date /t') do (
    set "datestamp=%%k%%j%%i"
)
for /f "tokens=1-2 delims=: " %%i in ('time /t') do (
    set "timestamp=%%i%%j"
)
set "timestamp=!timestamp::=!"
set "backup_file=backup_!datestamp!_!timestamp!.sql"

docker-compose exec postgres pg_dump -U admin server_admin > "backups\!backup_file!"

call :print_message "Backup created: backups\!backup_file!"
goto :eof

:restore_db
if "%~2"=="" (
    call :print_error "Please specify backup file: %~nx0 restore <backup_file>"
    exit /b 1
)

call :print_message "Restoring database from %~2..."

docker-compose exec -T postgres psql -U admin -d server_admin < "%~2"

call :print_message "Database restored successfully!"
goto :eof

:health_check
call :print_message "Checking service health..."

docker-compose ps | findstr "Up" >nul
if errorlevel 1 (
    call :print_error "Some containers are not running"
) else (
    call :print_message "Containers are running"
)

curl -f http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    call :print_warning "Backend health check failed"
) else (
    call :print_message "Backend is healthy"
)

curl -f http://localhost:4200 >nul 2>&1
if errorlevel 1 (
    call :print_warning "Frontend is not accessible"
) else (
    call :print_message "Frontend is accessible"
)
goto :eof

REM Main script logic
if "%1"=="dev" goto start_dev
if "%1"=="prod" goto start_prod
if "%1"=="build" goto build_images
if "%1"=="stop" goto stop_containers
if "%1"=="down" goto down_containers
if "%1"=="logs" goto show_logs
if "%1"=="clean" goto clean_docker
if "%1"=="backup" goto backup_db
if "%1"=="restore" goto restore_db
if "%1"=="health" goto health_check
if "%1"=="-h" goto show_help
if "%1"=="--help" goto show_help
if "%1"=="help" goto show_help
if "%1"=="" (
    call :print_error "No command specified. Use -h for help."
    exit /b 1
)

call :print_error "Unknown command: %1. Use -h for help."
exit /b 1
