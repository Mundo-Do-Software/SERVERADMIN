#!/bin/bash

# Setup da aplicação baseado no quick-install.sh
source "$(dirname "${BASH_SOURCE[0]}")/../utils/logging.sh"

# Configurações
INSTALL_DIR="/opt/ubuntu-server-admin"
SERVICE_USER="serveradmin"
DOMAIN="${DOMAIN:-server.mundodosoftware.com.br}"

# Evita prompts do Angular
export NG_CLI_ANALYTICS=false
export CI=true

setup_application() {
    log "Removendo instalações antigas..."
    rm -rf "$INSTALL_DIR" /var/www/html/serveradmin
    rm -f /etc/nginx/sites-available/serveradmin /etc/nginx/sites-enabled/serveradmin
    rm -f /var/log/nginx/serveradmin.*

    log "Clonando aplicação..."
    git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git "$INSTALL_DIR"
    chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR"

    setup_backend
    setup_frontend
}

setup_backend() {
    log "Configurando backend..."
    cd "$INSTALL_DIR/backend"
    
    # Criar ambiente virtual Python
    sudo -u "$SERVICE_USER" python3 -m venv venv
    sudo -u "$SERVICE_USER" venv/bin/pip install -r requirements.txt

    # Criar arquivo .env
    sudo -u "$SERVICE_USER" bash -c "cat > .env" << EOF
DATABASE_URL=postgresql://serveradmin:serveradmin123@localhost/serveradmin
REDIS_URL=redis://localhost:6379
SECRET_KEY=$(openssl rand -hex 32)
DEBUG=False
ALLOWED_HOSTS=$DOMAIN,localhost,127.0.0.1
EOF

    log_success "Backend configurado"
}

setup_frontend() {
    log "Configurando frontend..."
    cd "$INSTALL_DIR/frontend/ubuntu-server-admin"
    
    # Instalar dependências npm
    sudo -u "$SERVICE_USER" npm install
    
    # Build da aplicação Angular
    if sudo -u "$SERVICE_USER" npx ng build --configuration production --no-interactive; then
        log "Build do frontend concluído"
    else
        log_warning "Build otimizado falhou. Tentando básico..."
        sudo -u "$SERVICE_USER" npx ng build --aot=false --optimization=false --no-interactive
    fi

    # Copiar arquivos para web root
    mkdir -p /var/www/html/serveradmin/browser
    if [[ -d dist/ubuntu-server-admin/browser ]]; then
        cp -r dist/ubuntu-server-admin/browser/* /var/www/html/serveradmin/browser/
        log "Copiado de dist/ubuntu-server-admin/browser/"
    else
        cp -r dist/ubuntu-server-admin/* /var/www/html/serveradmin/browser/ || true
        log "Copiado de dist/ubuntu-server-admin/"
    fi
    
    chown -R www-data:www-data /var/www/html/serveradmin
    log_success "Frontend configurado"
}