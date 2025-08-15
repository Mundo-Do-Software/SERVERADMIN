#!/bin/bash

# Configuração do serviço systemd baseada no quick-install.sh
source "$(dirname "${BASH_SOURCE[0]}")/../utils/logging.sh"

setup_service() {
    log "Criando serviço systemd..."
    
    local INSTALL_DIR="/opt/ubuntu-server-admin"
    local SERVICE_USER="serveradmin"
    
    cat > /etc/systemd/system/ubuntu-server-admin.service << EOF
[Unit]
Description=Ubuntu Server Admin API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR/backend
Environment=PATH=$INSTALL_DIR/backend/venv/bin
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable ubuntu-server-admin
    systemctl start ubuntu-server-admin
    
    # Verificar se o serviço iniciou
    sleep 3
    if systemctl is-active --quiet ubuntu-server-admin; then
        log_success "Serviço ubuntu-server-admin iniciado"
    else
        log_error "Falha ao iniciar o serviço"
        systemctl status ubuntu-server-admin --no-pager
    fi
}