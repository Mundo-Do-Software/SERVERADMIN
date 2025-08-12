#!/bin/bash

# Script para corrigir configuração do backend
set -e

BACKEND_DIR="/opt/ubuntu-server-admin/backend"
SERVICE_USER="serveradmin"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Corrigir arquivo de configuração
fix_config() {
    log "Corrigindo arquivo de configuração..."
    
    # Backup do arquivo atual
    cp "$BACKEND_DIR/app/core/config.py" "$BACKEND_DIR/app/core/config.py.backup"
    
    # Criar novo arquivo de configuração
    cat > "$BACKEND_DIR/app/core/config.py" << 'EOF'
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./serveradmin.db"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    
    # App
    debug: bool = False
    app_name: str = "Ubuntu Server Admin"
    
    # CORS
    allowed_hosts: list = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
EOF
    
    chown "$SERVICE_USER:$SERVICE_USER" "$BACKEND_DIR/app/core/config.py"
    log "Arquivo de configuração corrigido"
}

# Criar arquivo .env simples
create_env() {
    log "Criando arquivo .env..."
    
    # Remover .env existente
    rm -f "$BACKEND_DIR/.env"
    
    # Criar novo .env
    cat > "$BACKEND_DIR/.env" << 'EOF'
DATABASE_URL=postgresql://serveradmin:serveradmin123@localhost/serveradmin
REDIS_URL=redis://localhost:6379
SECRET_KEY=ubuntu-server-admin-secret-key-2025
DEBUG=false
APP_NAME=Ubuntu Server Admin
EOF
    
    chown "$SERVICE_USER:$SERVICE_USER" "$BACKEND_DIR/.env"
    chmod 600 "$BACKEND_DIR/.env"
    log "Arquivo .env criado"
}

# Testar configuração
test_config() {
    log "Testando configuração..."
    
    cd "$BACKEND_DIR"
    if sudo -u "$SERVICE_USER" ./venv/bin/python -c "
import sys
sys.path.append('.')
try:
    from app.core.config import settings
    print('✅ Configuração carregada com sucesso')
    print(f'Database: {settings.database_url}')
    print(f'Debug: {settings.debug}')
except Exception as e:
    print(f'❌ Erro: {e}')
    exit(1)
"; then
        log "✅ Configuração OK"
        return 0
    else
        log "❌ Erro na configuração"
        return 1
    fi
}

# Reiniciar serviço
restart_service() {
    log "Reiniciando serviço..."
    
    systemctl stop ubuntu-server-admin 2>/dev/null || true
    systemctl start ubuntu-server-admin
    sleep 3
    
    if systemctl is-active ubuntu-server-admin &>/dev/null; then
        log "✅ Serviço iniciado com sucesso"
        
        # Verificar se porta 8000 está aberta
        if ss -tlnp | grep :8000 >/dev/null; then
            log "✅ API rodando na porta 8000"
        else
            log "❌ API não está rodando na porta 8000"
        fi
    else
        log "❌ Falha ao iniciar serviço"
        journalctl -u ubuntu-server-admin -n 10 --no-pager
    fi
}

# Função principal
main() {
    if [[ $EUID -ne 0 ]]; then
        echo "Execute como root: sudo ./fix-backend-config.sh"
        exit 1
    fi
    
    log "🔧 Corrigindo configuração do backend..."
    
    fix_config
    create_env
    test_config
    restart_service
    
    log "🎉 Correção concluída!"
}

main "$@"
