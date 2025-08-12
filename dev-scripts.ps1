# Scripts de desenvolvimento para Ubuntu Server Admin (Windows)

function Show-Menu {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Ubuntu Server Admin - Scripts" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "1. Instalar dependências do Backend"
    Write-Host "2. Instalar dependências do Frontend"
    Write-Host "3. Iniciar Backend (Python)"
    Write-Host "4. Iniciar Frontend (Angular)"
    Write-Host "5. Iniciar ambos simultaneamente"
    Write-Host "6. Criar ambiente virtual Python"
    Write-Host "7. Executar testes"
    Write-Host "8. Sair"
    Write-Host "==========================================" -ForegroundColor Cyan
}

function Install-BackendDeps {
    Write-Host "Instalando dependências do Backend..." -ForegroundColor Green
    Set-Location backend
    
    if (!(Test-Path "venv")) {
        Write-Host "Criando ambiente virtual..." -ForegroundColor Yellow
        python -m venv venv
    }
    
    .\venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    Write-Host "Dependências do backend instaladas!" -ForegroundColor Green
    Set-Location ..
}

function Install-FrontendDeps {
    Write-Host "Instalando dependências do Frontend..." -ForegroundColor Green
    Set-Location frontend\ubuntu-server-admin
    npm install
    Write-Host "Dependências do frontend instaladas!" -ForegroundColor Green
    Set-Location ..\..
}

function Start-Backend {
    Write-Host "Iniciando Backend..." -ForegroundColor Green
    Set-Location backend
    .\venv\Scripts\Activate.ps1
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
}

function Start-Frontend {
    Write-Host "Iniciando Frontend..." -ForegroundColor Green
    Set-Location frontend\ubuntu-server-admin
    ng serve --host 0.0.0.0 --port 4200
}

function Start-Both {
    Write-Host "Iniciando Backend e Frontend..." -ForegroundColor Green
    
    # Iniciar backend em background
    Start-Process PowerShell -ArgumentList "-Command", "cd backend; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload --host 0.0.0.0 --port 8000"
    Start-Sleep 3
    
    # Iniciar frontend
    Start-Process PowerShell -ArgumentList "-Command", "cd frontend\ubuntu-server-admin; ng serve --host 0.0.0.0 --port 4200"
    
    Write-Host "Serviços iniciados em janelas separadas!" -ForegroundColor Green
    Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:4200" -ForegroundColor Cyan
}

function Create-VirtualEnv {
    Write-Host "Criando ambiente virtual Python..." -ForegroundColor Green
    Set-Location backend
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    pip install --upgrade pip
    Write-Host "Ambiente virtual criado em backend\venv" -ForegroundColor Green
    Set-Location ..
}

function Run-Tests {
    Write-Host "Executando testes..." -ForegroundColor Green
    
    # Testes do backend
    Write-Host "Testes do Backend..." -ForegroundColor Yellow
    Set-Location backend
    if (Test-Path "venv") {
        .\venv\Scripts\Activate.ps1
        python -m pytest tests\ -v
    } else {
        Write-Host "Ambiente virtual não encontrado. Execute a opção 1 primeiro." -ForegroundColor Red
    }
    Set-Location ..
    
    # Testes do frontend
    Write-Host "Testes do Frontend..." -ForegroundColor Yellow
    Set-Location frontend\ubuntu-server-admin
    npm test -- --watch=false --browsers=ChromeHeadless
    Set-Location ..\..
}

# Loop principal
do {
    Clear-Host
    Show-Menu
    $choice = Read-Host "Escolha uma opção"
    
    switch ($choice) {
        "1" { Install-BackendDeps }
        "2" { Install-FrontendDeps }
        "3" { Start-Backend }
        "4" { Start-Frontend }
        "5" { Start-Both }
        "6" { Create-VirtualEnv }
        "7" { Run-Tests }
        "8" { 
            Write-Host "Saindo..." -ForegroundColor Yellow
            exit 
        }
        default { 
            Write-Host "Opção inválida. Tente novamente." -ForegroundColor Red 
        }
    }
    
    if ($choice -ne "8") {
        Write-Host ""
        Read-Host "Pressione Enter para continuar..."
    }
} while ($choice -ne "8")
