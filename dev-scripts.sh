#!/bin/bash

# Scripts de desenvolvimento para Ubuntu Server Admin

# Função para mostrar o menu
show_menu() {
    echo "=========================================="
    echo "  Ubuntu Server Admin - Scripts"
    echo "=========================================="
    echo "1. Instalar dependências do Backend"
    echo "2. Instalar dependências do Frontend"
    echo "3. Iniciar Backend (Python)"
    echo "4. Iniciar Frontend (Angular)"
    echo "5. Iniciar ambos simultaneamente"
    echo "6. Criar ambiente virtual Python"
    echo "7. Executar testes"
    echo "8. Sair"
    echo "=========================================="
}

# Função para instalar dependências do backend
install_backend_deps() {
    echo "Instalando dependências do Backend..."
    cd backend
    if [ ! -d "venv" ]; then
        echo "Criando ambiente virtual..."
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -r requirements.txt
    echo "Dependências do backend instaladas!"
    cd ..
}

# Função para instalar dependências do frontend
install_frontend_deps() {
    echo "Instalando dependências do Frontend..."
    cd frontend/ubuntu-server-admin
    npm install
    echo "Dependências do frontend instaladas!"
    cd ../..
}

# Função para iniciar o backend
start_backend() {
    echo "Iniciando Backend..."
    cd backend
    source venv/bin/activate
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
}

# Função para iniciar o frontend
start_frontend() {
    echo "Iniciando Frontend..."
    cd frontend/ubuntu-server-admin
    ng serve --host 0.0.0.0 --port 4200
}

# Função para iniciar ambos
start_both() {
    echo "Iniciando Backend e Frontend..."
    # Iniciar backend em background
    cd backend
    source venv/bin/activate
    uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ..
    
    # Iniciar frontend
    cd frontend/ubuntu-server-admin
    ng serve --host 0.0.0.0 --port 4200 &
    FRONTEND_PID=$!
    cd ../..
    
    echo "Backend PID: $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"
    echo "Para parar os serviços, use: kill $BACKEND_PID $FRONTEND_PID"
    
    # Aguardar algum dos processos terminar
    wait
}

# Função para criar ambiente virtual
create_venv() {
    echo "Criando ambiente virtual Python..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    echo "Ambiente virtual criado em backend/venv"
    cd ..
}

# Função para executar testes
run_tests() {
    echo "Executando testes..."
    
    # Testes do backend
    echo "Testes do Backend..."
    cd backend
    if [ -d "venv" ]; then
        source venv/bin/activate
        python -m pytest tests/ -v
    else
        echo "Ambiente virtual não encontrado. Execute a opção 1 primeiro."
    fi
    cd ..
    
    # Testes do frontend
    echo "Testes do Frontend..."
    cd frontend/ubuntu-server-admin
    npm test -- --watch=false --browsers=ChromeHeadless
    cd ../..
}

# Loop principal
while true; do
    show_menu
    read -p "Escolha uma opção: " choice
    
    case $choice in
        1)
            install_backend_deps
            ;;
        2)
            install_frontend_deps
            ;;
        3)
            start_backend
            ;;
        4)
            start_frontend
            ;;
        5)
            start_both
            ;;
        6)
            create_venv
            ;;
        7)
            run_tests
            ;;
        8)
            echo "Saindo..."
            exit 0
            ;;
        *)
            echo "Opção inválida. Tente novamente."
            ;;
    esac
    
    echo ""
    read -p "Pressione Enter para continuar..."
    clear
done
