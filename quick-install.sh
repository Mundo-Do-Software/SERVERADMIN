#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# Ubuntu Server Admin - Script de Instalação Simplificado
# ==============================================================================

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

# Evita prompts do Angular
export NG_CLI_ANALYTICS=false
export CI=true

log()        { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
log_error()  { echo -e "${RED}[ERROR] $1${NC}" >&2; }
log_warning(){ echo -e "${YELLOW}[WARNING] $1${NC}"; }

check_root() {
  if [[ $EUID -ne 0 ]]; then
    log_error "Execute como root: sudo ./quick-install.sh"
    exit 1
  fi
}

update_system() {
  log "Atualizando sistema..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get upgrade -y -qq || true
}

install_dependencies() {
  log "Instalando dependências..."
  apt-get install -y \
    python3 python3-pip python3-venv \
    postgresql postgresql-contrib \
    redis-server \
    nginx \
    git curl wget ufw

  if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
    log_error "Node.js/npm ausentes. Instale:"
    log_error "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -"
    log_error "sudo apt-get install -y nodejs"
    exit 1
  else
    log "Node.js: $(node --version), npm: $(npm --version)"
  fi
}

setup_user() {
  log "Criando usuário do sistema..."
  if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -m -s /bin/bash "$SERVICE_USER"
  fi
}

setup_database() {
  log "Configurando PostgreSQL..."
  sudo -u postgres psql -c "CREATE USER serveradmin WITH PASSWORD 'serveradmin123';" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE DATABASE serveradmin OWNER serveradmin;" 2>/dev/null || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE serveradmin TO serveradmin;" 2>/dev/null || true
}

setup_application() {
  log "Removendo instalações antigas..."
  rm -rf "$INSTALL_DIR" /var/www/html/serveradmin
  rm -f /etc/nginx/sites-available/serveradmin /etc/nginx/sites-enabled/serveradmin
  rm -f /var/log/nginx/serveradmin.*

  log "Clonando aplicação..."
  git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git "$INSTALL_DIR"
  chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR"

  log "Configurando backend..."
  cd "$INSTALL_DIR/backend"
  sudo -u "$SERVICE_USER" python3 -m venv venv
  sudo -u "$SERVICE_USER" venv/bin/pip install -r requirements.txt

  sudo -u "$SERVICE_USER" bash -c "cat > .env" << EOF
DATABASE_URL=postgresql://serveradmin:serveradmin123@localhost/serveradmin
REDIS_URL=redis://localhost:6379
SECRET_KEY=$(openssl rand -hex 32)
DEBUG=False
ALLOWED_HOSTS=$DOMAIN,localhost,127.0.0.1
EOF

  log "Configurando frontend..."
  cd "$INSTALL_DIR/frontend/ubuntu-server-admin"
  sudo -u "$SERVICE_USER" npm install
  # Build não-interativo
  if sudo -u "$SERVICE_USER" npx ng build --configuration production --no-interactive; then
    log "Build do frontend concluído"
  else
    log_warning "Build otimizado falhou. Tentando básico..."
    sudo -u "$SERVICE_USER" npx ng build --aot=false --optimization=false --no-interactive
  fi

  mkdir -p /var/www/html/serveradmin/browser
  if [[ -d dist/ubuntu-server-admin/browser ]]; then
    cp -r dist/ubuntu-server-admin/browser/* /var/www/html/serveradmin/browser/
  else
    cp -r dist/ubuntu-server-admin/* /var/www/html/serveradmin/browser/ || true
  fi
  chown -R www-data:www-data /var/www/html/serveradmin
}

setup_nginx() {
  log "Configurando NGINX..."
  cat > /etc/nginx/sites-available/serveradmin << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/html/serveradmin/browser;
    index index.html;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    access_log /var/log/nginx/serveradmin.access.log;
    error_log /var/log/nginx/serveradmin.error.log;
}
EOF
  ln -sf /etc/nginx/sites-available/serveradmin /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  if ! systemctl is-active nginx &>/dev/null; then
    systemctl start nginx
    systemctl enable nginx
  else
    systemctl reload nginx
  fi
}

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

setup_firewall() {
  log "Configurando firewall..."
  ufw --force enable || true
  ufw allow ssh || true
  ufw allow 'Nginx Full' || true
}

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
  echo -e "${GREEN}INSTALAÇÃO CONCLUÍDA${NC}"
  echo -e "${BLUE}🌍 Acesse: http://$DOMAIN${NC}"
  echo -e "${BLUE}📱 API: http://$DOMAIN/api${NC}"
  echo -e "${BLUE}📚 Docs: http://$DOMAIN/api/docs${NC}"
  echo ""
  echo -e "${YELLOW}🔐 Credenciais padrão: admin / admin123${NC}"
}

main "$@"