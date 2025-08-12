# Script para verificar suporte à GPU no Docker
Write-Host "=== GPU Docker Support Check ===" -ForegroundColor Cyan

# Verificar se NVIDIA drivers estão instalados
Write-Host "`nChecking NVIDIA drivers..." -ForegroundColor Yellow
try {
    $nvidiaDrivers = nvidia-smi
    if ($nvidiaDrivers) {
        Write-Host "✓ NVIDIA drivers found" -ForegroundColor Green
        nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv
    }
}
catch {
    Write-Host "✗ NVIDIA drivers not found or nvidia-smi not available" -ForegroundColor Red
}

# Verificar Docker Desktop GPU support
Write-Host "`nChecking Docker GPU support..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info
    if ($dockerInfo -match "nvidia") {
        Write-Host "✓ Docker NVIDIA runtime detected" -ForegroundColor Green
    } else {
        Write-Host "! Docker NVIDIA runtime not detected" -ForegroundColor Yellow
        Write-Host "  Make sure Docker Desktop has GPU support enabled" -ForegroundColor Gray
    }
}
catch {
    Write-Host "✗ Could not check Docker info" -ForegroundColor Red
}

# Testar container com GPU
Write-Host "`nTesting GPU container..." -ForegroundColor Yellow
try {
    Write-Host "Running test container..." -ForegroundColor Gray
    $gpuTest = docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ GPU container test successful!" -ForegroundColor Green
    } else {
        Write-Host "✗ GPU container test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Could not run GPU test container" -ForegroundColor Red
    Write-Host "  You might need to install NVIDIA Container Toolkit" -ForegroundColor Gray
}

Write-Host "`n=== Setup Instructions ===" -ForegroundColor Cyan
Write-Host "If GPU support is not working:" -ForegroundColor White
Write-Host "1. Install NVIDIA drivers from nvidia.com" -ForegroundColor Gray
Write-Host "2. Install Docker Desktop and enable GPU support in settings" -ForegroundColor Gray
Write-Host "3. For WSL2: Install NVIDIA Container Toolkit in WSL" -ForegroundColor Gray
Write-Host "4. Restart Docker Desktop after configuration" -ForegroundColor Gray
