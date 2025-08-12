#!/bin/bash

# ==============================================================================
# Ubuntu Server Admin - Script de Instalação Simplificado
# ==============================================================================
# Versão simplificada focada em funcionalidade básica
# ==============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações básicas
INSTALL_DIR="/opt/ubuntu-server-admin"
SERVICE_USER="serveradmin"
DOMAIN="server.mundodosoftware.com.br"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Execute como root: sudo ./quick-install.sh"
        exit 1
    fi
}

# 1. Atualizar sistema
update_system() {
    log "Atualizando sistema..."
    apt-get update
    apt-get upgrade -y
}

# 2. Instalar dependências básicas
install_dependencies() {
    log "Instalando dependências..."
    
    # Instalar apenas dependências básicas
    apt-get install -y \
        python3 python3-pip python3-venv \
        postgresql postgresql-contrib \
        redis-server \
        nginx \
        git curl wget
    
    # Verificar Node.js e npm
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        log_error "Node.js ou npm não encontrados. Por favor, instale manualmente:"
        log_error "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -"
        log_error "sudo apt-get install -y nodejs"
        exit 1
    else
        log "Node.js: $(node --version), npm: $(npm --version)"
    fi
}

# 3. Configurar usuário
setup_user() {
    log "Criando usuário do sistema..."
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -m -s /bin/bash "$SERVICE_USER"
    fi
}

# 4. Configurar banco
setup_database() {
    log "Configurando PostgreSQL..."
    
    sudo -u postgres psql -c "CREATE USER serveradmin WITH PASSWORD 'serveradmin123';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE serveradmin OWNER serveradmin;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE serveradmin TO serveradmin;" 2>/dev/null || true
}

# 5. Clonar e configurar aplicação
setup_application() {
    log "Configurando aplicação..."
    
    # Limpar diretório se existir
    rm -rf "$INSTALL_DIR"
    
    # Clonar repositório
    git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git "$INSTALL_DIR"
    chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR"
    
    # Configurar backend
    cd "$INSTALL_DIR/backend"
    sudo -u "$SERVICE_USER" python3 -m venv venv
    sudo -u "$SERVICE_USER" venv/bin/pip install -r requirements.txt
    
    # Criar arquivo .env
    sudo -u "$SERVICE_USER" cat > .env << EOF
DATABASE_URL=postgresql://serveradmin:serveradmin123@localhost/serveradmin
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=$DOMAIN,localhost,127.0.0.1
EOF

    # Configurar frontend
    cd "$INSTALL_DIR/frontend/ubuntu-server-admin"
    sudo -u "$SERVICE_USER" npm install
    sudo -u "$SERVICE_USER" npm run build
    
    # Copiar arquivos buildados
    rm -rf /var/www/html/serveradmin
    mkdir -p /var/www/html/serveradmin
    cp -r dist/ubuntu-server-admin/* /var/www/html/serveradmin/
    chown -R www-data:www-data /var/www/html/serveradmin
}

# 6. Configurar NGINX (apenas HTTP)
setup_nginx() {
    log "Configurando NGINX..."
    
    cat > /etc/nginx/sites-available/serveradmin << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html/serveradmin;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs
    access_log /var/log/nginx/serveradmin.access.log;
    error_log /var/log/nginx/serveradmin.error.log;
}
EOF

    # Ativar site
    ln -sf /etc/nginx/sites-available/serveradmin /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar e recarregar
    nginx -t
    systemctl reload nginx
}

# 7. Criar serviço systemd
setup_service() {
    log "Criando serviço systemd..."
    
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
}

# 8. Configurar firewall básico
setup_firewall() {
    log "Configurando firewall..."
    ufw --force enable
    ufw allow ssh
    ufw allow 'Nginx Full'
}

# Função principal
main() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Ubuntu Server Admin Setup         ║${NC}"
    echo -e "${BLUE}║          Instalação Rápida              ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""
    
    check_root
    
    log "Iniciando instalação..."
    update_system
    install_dependencies
    setup_user
    setup_database
    setup_application
    setup_nginx
    setup_service
    setup_firewall
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         INSTALAÇÃO CONCLUÍDA            ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}🌍 Acesse: http://$DOMAIN${NC}"
    echo -e "${BLUE}📱 API: http://$DOMAIN/api${NC}"
    echo -e "${BLUE}📚 Docs: http://$DOMAIN/api/docs${NC}"
    echo ""
    echo -e "${YELLOW}🔐 Credenciais padrão:${NC}"
    echo -e "${YELLOW}   Usuário: admin${NC}"
    echo -e "${YELLOW}   Senha: admin123${NC}"
    echo ""
    echo -e "${YELLOW}⚡ Comandos úteis:${NC}"
    echo -e "${YELLOW}   Status: systemctl status ubuntu-server-admin${NC}"
    echo -e "${YELLOW}   Logs: journalctl -u ubuntu-server-admin -f${NC}"
    echo -e "${YELLOW}   Reiniciar: systemctl restart ubuntu-server-admin${NC}"
    echo ""
}

main "$@"
