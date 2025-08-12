param([string]$Command = "help")

Write-Host "Docker Manager - ServerAdmin" -ForegroundColor Green
Write-Host "Command received: $Command" -ForegroundColor Yellow

switch ($Command) {
    "help" {
        Write-Host "Available commands:" -ForegroundColor Cyan
        Write-Host "  dev    - Start development environment" -ForegroundColor Gray
        Write-Host "  stop   - Stop all containers" -ForegroundColor Gray
        Write-Host "  health - Check health" -ForegroundColor Gray
        Write-Host "  gpu    - Check GPU access" -ForegroundColor Gray
    }
    "dev" {
        Write-Host "Starting development environment with GPU support..." -ForegroundColor Green
        docker-compose -f docker-compose.dev.yml up -d
    }
    "stop" {
        Write-Host "Stopping containers..." -ForegroundColor Yellow
        docker-compose stop
        docker-compose -f docker-compose.dev.yml stop
    }
    "health" {
        Write-Host "Checking health..." -ForegroundColor Cyan
        docker-compose ps
    }
    "gpu" {
        Write-Host "Checking GPU access in containers..." -ForegroundColor Cyan
        Write-Host "`nBackend GPU access:" -ForegroundColor Yellow
        docker exec serveradmin-backend-1 nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader,nounits
        Write-Host "`nGPU processes in backend:" -ForegroundColor Yellow
        docker exec serveradmin-backend-1 nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv,noheader,nounits
    }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Use 'help' for available commands"
    }
}
