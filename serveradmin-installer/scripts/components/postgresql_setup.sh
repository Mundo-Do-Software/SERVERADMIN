#!/bin/bash

# Configuração do PostgreSQL baseada no quick-install.sh

setup_database() {
    log "Configurando PostgreSQL..."
    
    # Iniciar serviços se não estiverem rodando
    systemctl start postgresql
    systemctl enable postgresql
    systemctl start redis-server
    systemctl enable redis-server
    
    # Criar usuário e banco
    sudo -u postgres psql -c "CREATE USER serveradmin WITH PASSWORD 'serveradmin123';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE serveradmin OWNER serveradmin;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE serveradmin TO serveradmin;" 2>/dev/null || true
    
    log_success "PostgreSQL configurado"
}

setup_user() {
    log "Criando usuário do sistema..."
    local SERVICE_USER="serveradmin"
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -m -s /bin/bash "$SERVICE_USER"
        log_success "Usuário $SERVICE_USER criado"
    else
        log "Usuário $SERVICE_USER já existe"
    fi
}