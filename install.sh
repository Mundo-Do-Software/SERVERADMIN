#!/usr/bin/env bash
set -Eeuo pipefail

# =========================
# Cores e logging
# =========================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

timestamp() { date +"[%Y-%m-%d %H:%M:%S]"; }
log()       { echo -e "${GREEN}$(timestamp) $*${NC}"; }
log_info()  { echo -e "${BLUE}$(timestamp) $*${NC}"; }
log_warning(){ echo -e "${YELLOW}$(timestamp) WARN: $*${NC}"; }
log_error() { echo -e "${RED}$(timestamp) ERROR: $*${NC}" >&2; }

trap 'log_error "Falha na linha $LINENO"; exit 1' ERR

# =========================
# ConfiguraÃƒÂ§ÃƒÂµes padrÃƒÂ£o
# =========================
SERVICE_USER="serveradmin"
INSTALL_DIR="/opt/ubuntu-server-admin"
NGINX_SITE="serveradmin"

DOMAIN=""
SSL_EMAIL=""
USE_DOMAIN=false
HTTPS_ENABLED=false

AUTO_INSTALL=false
SKIP_SSL=false

DB_USER="serveradmin"
DB_NAME="serveradmin"
DB_PASSWORD=""

PUBLIC_IPV4=""
PUBLIC_IPV6=""
LOCAL_IPV4S=""
LOCAL_IPV6S=""

# =========================
# Utilidades
# =========================
generate_password() {
  openssl rand -base64 32
}

detect_ips() {
  log_info "Detectando IPs..."
  # Locais
  LOCAL_IPV4S=$(ip -4 addr show scope global 2>/dev/null | awk '/inet /{print $2}' | cut -d'/' -f1 | tr '\n' ' ' | sed 's/ *$//')
  LOCAL_IPV6S=$(ip -6 addr show scope global 2>/dev/null | awk '/inet6 /{print $2}' | cut -d'/' -f1 | tr '\n' ' ' | sed 's/ *$//')

  # PÃƒÂºblicos
  PUBLIC_IPV4=$(curl -4 -fsS https://ifconfig.co 2>/dev/null || curl -4 -fsS https://api.ipify.org 2>/dev/null || true)
  PUBLIC_IPV6=$(curl -6 -fsS https://ifconfig.co 2>/dev/null || curl -6 -fsS https://api64.ipify.org 2>/dev/null || true)

  [[ -z "$PUBLIC_IPV4" ]] && log_warning "NÃƒÂ£o foi possÃƒÂ­vel detectar IPv4 pÃƒÂºblico"
  [[ -z "$PUBLIC_IPV6" ]] && log_warning "NÃƒÂ£o foi possÃƒÂ­vel detectar IPv6 pÃƒÂºblico"

  log_info "IPv4 local(ais): ${LOCAL_IPV4S:-nenhum}"
  log_info "IPv6 local(ais): ${LOCAL_IPV6S:-nenhum}"
  log_info "IPv4 pÃƒÂºblico: ${PUBLIC_IPV4:-desconhecido}"
  log_info "IPv6 pÃƒÂºblico: ${PUBLIC_IPV6:-desconhecido}"
}

check_root() {
  if [[ $EUID -ne 0 ]]; then
    log_error "Este script deve ser executado como root ou com sudo"
    exit 1
  fi
}

check_ubuntu() {
  if ! command -v lsb_release &>/dev/null; then
    log_error "Sistema operacional nÃƒÂ£o identificado"
    exit 1
  fi
  OS_VERSION=$(lsb_release -rs)
  OS_NAME=$(lsb_release -is)
  if [[ "$OS_NAME" != "Ubuntu" ]]; then
    log_error "Este script foi desenvolvido para Ubuntu. Detectado: $OS_NAME"
    exit 1
  fi
  if [[ $(echo "$OS_VERSION >= 20.04" | bc -l) -eq 0 ]]; then
    log_error "Ubuntu 20.04+ ÃƒÂ© necessÃƒÂ¡rio. Detectado: $OS_VERSION"
    exit 1
  fi
  log "Sistema compatÃƒÂ­vel detectado: $OS_NAME $OS_VERSION"
}

check_system_health() {
  log "Verificando saÃƒÂºde do sistema..."
  local available_space=$(df / | awk 'NR==2 {print $4}')
  local required_space=10485760 # 10GB em KB
  if [[ $available_space -lt $required_space ]]; then
    log_error "EspaÃƒÂ§o insuficiente em disco. NecessÃƒÂ¡rio: 10GB, DisponÃƒÂ­vel: $(($available_space/1024/1024))GB"
    exit 1
  fi
  local available_ram=$(free -m | awk 'NR==2{print $7}')
  local required_ram=1024
  if [[ $available_ram -lt $required_ram ]]; then
    log_warning "RAM disponÃƒÂ­vel baixa: ${available_ram}MB (recomendado: 2GB+)"
  fi
  if ! ping -c 1 8.8.8.8 &>/dev/null; then
    log_error "Sem conexÃƒÂ£o com a internet"
    exit 1
  fi
  local ports=(80 443 5432 6379 8000)
  for port in "${ports[@]}"; do
    if ss -tuln 2>/dev/null | grep -q ":$port "; then
      log_warning "Porta $port jÃƒÂ¡ estÃƒÂ¡ em uso"
    fi
  done
  log "VerificaÃƒÂ§ÃƒÂ£o de saÃƒÂºde concluÃƒÂ­da"
}

fix_repository_issues() {
  log "Verificando e corrigindo problemas de repositÃƒÂ³rios..."
  cp /etc/apt/sources.list /etc/apt/sources.list.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

  # Locks
  rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock 2>/dev/null || true
  dpkg --configure -a 2>/dev/null || true

  apt clean
  apt autoclean

  if ! apt update -qq; then
    log_warning "Problemas detectados, tentando correÃƒÂ§ÃƒÂ£o..."
    apt-get clean
    apt-get update --fix-missing
    if ! apt update -qq; then
      log_warning "Regenerando lista bÃƒÂ¡sica de repositÃƒÂ³rios..."
      local codename=$(lsb_release -cs)
      cat > /etc/apt/sources.list << EOF
deb http://archive.ubuntu.com/ubuntu/ $codename main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $codename-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $codename-security main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $codename-backports main restricted universe multiverse
EOF
      apt update -qq
    fi
  fi
  log "RepositÃƒÂ³rios verificados e corrigidos"
}

prompt_config() {
  echo -e "${CYAN}Ã¢â€¢â€Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢â€”${NC}"
  echo -e "${CYAN}Ã¢â€¢â€˜                  ConfiguraÃƒÂ§ÃƒÂ£o da InstalaÃƒÂ§ÃƒÂ£o                   Ã¢â€¢â€˜${NC}"
  echo -e "${CYAN}Ã¢â€¢Å¡Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â${NC}"
  echo ""

  echo -e "${BLUE}Ã°Å¸Å’Â DomÃƒÂ­nio (opcional):${NC}"
  read -p "Digite o domÃƒÂ­nio (ou deixe em branco): " input_domain
  if [[ -n "$input_domain" ]]; then
    DOMAIN="$input_domain"
    USE_DOMAIN=true
  else
    DOMAIN=""
    USE_DOMAIN=false
  fi

  if [[ "$USE_DOMAIN" == true ]]; then
    while true; do
      read -p "Email para certificados SSL: " input_email
      if [[ -z "$input_email" ]]; then
        SSL_EMAIL="admin@${DOMAIN}"
        break
      elif [[ "$input_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        SSL_EMAIL="$input_email"
        break
      else
        echo -e "${RED}Email invÃƒÂ¡lido${NC}"
      fi
    done
  fi

  read -p "DiretÃƒÂ³rio de instalaÃƒÂ§ÃƒÂ£o (padrÃƒÂ£o: /opt/ubuntu-server-admin): " input_dir
  [[ -n "$input_dir" ]] && INSTALL_DIR="$input_dir"

  echo -e "${GREEN}Resumo:${NC}"
  echo -e "${CYAN}DomÃƒÂ­nio:${NC} ${DOMAIN:-(nÃƒÂ£o configurado)}"
  [[ "$USE_DOMAIN" == true ]] && echo -e "${CYAN}Email SSL:${NC} $SSL_EMAIL"
  echo -e "${CYAN}DiretÃƒÂ³rio:${NC} $INSTALL_DIR"

  while true; do
    read -p "Continuar? (s/N): " confirm
    case "$confirm" in
      [SsYy]*) break ;;
      "") echo -e "${YELLOW}Cancelado${NC}"; exit 0 ;;
      *) echo "Responda s ou n";;
    esac
  done
}

update_system() {
  log "Atualizando sistema..."
  export DEBIAN_FRONTEND=noninteractive
  export APT_LISTCHANGES_FRONTEND=none
  apt update -qq || true
  apt upgrade -y -qq || apt upgrade -y -qq
  apt install -y software-properties-common curl wget git unzip bc ufw
  log "Sistema atualizado"
}

install_python() {
  log "Instalando Python..."
  apt install -y python3 python3-venv python3-dev python3-pip
  python3 -m pip install --upgrade pip || true
  log "Python instalado"
}

install_nodejs() {
  log "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  npm install -g @angular/cli@latest
  log "Node.js $(node --version) e npm $(npm --version) instalados"
}

install_nginx() {
  log "Instalando NGINX..."
  apt install -y nginx
  systemctl enable nginx
  systemctl start nginx
  ufw allow 'Nginx Full' || true
  log "NGINX instalado"
}

install_postgresql() {
  log "Instalando PostgreSQL..."
  apt install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
  DB_PASSWORD=$(generate_password)
  sudo -u postgres psql << EOF
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
  log "PostgreSQL instalado e banco configurado"
}

install_redis() {
  log "Instalando Redis..."
  apt install -y redis-server
  sed -i 's/^supervised .*/supervised systemd/' /etc/redis/redis.conf
  systemctl enable redis-server
  systemctl restart redis-server
  log "Redis instalado"
}

install_certbot() {
  log "Instalando Certbot..."
  apt install -y certbot python3-certbot-nginx || true
  log "Certbot instalado"
}

create_user() {
  log "Criando usuÃƒÂ¡rio do sistema..."
  if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d "$INSTALL_DIR" -m "$SERVICE_USER"
  fi
  log "UsuÃƒÂ¡rio: $SERVICE_USER"
}

clone_repository() {
  log "Clonando repositÃƒÂ³rio..."
  if [[ -d "$INSTALL_DIR" ]]; then
    log_warning "DiretÃƒÂ³rio existe. Backup..."
    mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
  fi
  git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git "$INSTALL_DIR"
  chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
  log "RepositÃƒÂ³rio clonado em $INSTALL_DIR"
}

setup_backend() {
  log "Configurando backend..."
  cd "$INSTALL_DIR/backend"
  sudo -u "$SERVICE_USER" python3 -m venv venv
  sudo -u "$SERVICE_USER" bash -c "source venv/bin/activate && pip install -r requirements.txt"

  JWT_SECRET=$(openssl rand -hex 64)
  cat > .env << EOF
# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost/$DB_NAME

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=$JWT_SECRET
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480

# Admin User
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false

# CORS
CORS_ORIGINS=http://localhost,http://127.0.0.1,http://[::1],http://$PUBLIC_IPV4,http://$PUBLIC_IPV6${DOMAIN:+,http://$DOMAIN,https://$DOMAIN}

# Network info
PUBLIC_IPV4=${PUBLIC_IPV4}
PUBLIC_IPV6=${PUBLIC_IPV6}
LOCAL_IPV4S=${LOCAL_IPV4S}
LOCAL_IPV6S=${LOCAL_IPV6S}
DOMAIN=${DOMAIN}
EOF
  chown "$SERVICE_USER:$SERVICE_USER" .env
  chmod 600 .env
  log "Backend configurado"
}

setup_frontend() {
  log "Configurando frontend..."
  export NG_CLI_ANALYTICS=false
  export CI=true

  cd "$INSTALL_DIR/frontend/ubuntu-server-admin"
  log_info "Instalando dependÃƒÂªncias do Node..."
  sudo -u "$SERVICE_USER" npm install

  # Ambiente de produÃƒÂ§ÃƒÂ£o
  log_info "Escrevendo environment.prod.ts..."
  sudo -u "$SERVICE_USER" bash -c "cat > src/environments/environment.prod.ts" << EOF
export const environment = {
  production: true,
  apiUrl: '/api/v1',
  apiBaseUrl: '/api',
  network: {
    domain: '${DOMAIN}',
    httpsEnabled: ${HTTPS_ENABLED},
    publicIPv4: '${PUBLIC_IPV4}',
    publicIPv6: '${PUBLIC_IPV6}',
    localIPv4s: '${LOCAL_IPV4S}',
    localIPv6s: '${LOCAL_IPV6S}'
  }
};
EOF

  log_info "Limpando cache do Angular..."
  sudo -u "$SERVICE_USER" npx ng cache clean 2>/dev/null || true

  log_info "Compilando Angular (produÃƒÂ§ÃƒÂ£o, nÃƒÂ£o-interativo)..."
  if sudo -u "$SERVICE_USER" npx ng build --configuration production ; then
    log "Build concluÃƒÂ­do"
  else
    log_warning "Build otimizado falhou. Tentando build bÃƒÂ¡sico..."
    sudo -u "$SERVICE_USER" npx ng build --aot=false --optimization=false 
    log_warning "Build bÃƒÂ¡sico concluÃƒÂ­do"
  fi

  # InstalaÃƒÂ§ÃƒÂ£o no NGINX
  log_info "Instalando arquivos no NGINX..."
  rm -rf /var/www/html/serveradmin
  mkdir -p /var/www/html/serveradmin/browser

  if [[ -d "dist/ubuntu-server-admin/browser" ]]; then
    cp -r dist/ubuntu-server-admin/browser/* /var/www/html/serveradmin/browser/
  else
    cp -r dist/ubuntu-server-admin/* /var/www/html/serveradmin/browser/ || true
  fi
  chown -R www-data:www-data /var/www/html/serveradmin

  if [[ -f "/var/www/html/serveradmin/browser/index.html" ]]; then
    log "Frontend instalado"
  else
    log_error "Arquivos do frontend nÃƒÂ£o encontrados no destino"
    exit 1
  fi
}

create_systemd_service() {
  log "Criando serviÃƒÂ§o systemd..."
  cat > /etc/systemd/system/ubuntu-server-admin.service << EOF
[Unit]
Description=Ubuntu Server Admin API
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR/backend
Environment=PATH=$INSTALL_DIR/backend/venv/bin
EnvironmentFile=$INSTALL_DIR/backend/.env
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable ubuntu-server-admin
  log "ServiÃƒÂ§o criado"
}

configure_nginx() {
  log "Configurando NGINX..."
  cat > /etc/nginx/sites-available/$NGINX_SITE << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend (Angular)
    root /var/www/html/serveradmin/browser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
        proxy_buffering off;
    }

    # ACME challenge
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/html/serveradmin;
    }

    # Security
    location ~ /\. {
        deny all;
    }

    access_log /var/log/nginx/serveradmin.access.log;
    error_log /var/log/nginx/serveradmin.error.log;
}
EOF
  ln -sf /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
  log "NGINX configurado"
}

setup_ssl() {
  log "Configurando SSL (opcional)..."
  if [[ "$USE_DOMAIN" == true && -n "$DOMAIN" ]]; then
    if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL"; then
      systemctl enable certbot.timer 2>/dev/null || true
      systemctl start certbot.timer 2>/dev/null || true
      HTTPS_ENABLED=true
      log "SSL configurado para $DOMAIN"
    else
      log_warning "Falha ao obter certificado SSL. VocÃƒÂª pode tentar depois com: certbot --nginx -d $DOMAIN"
    fi
  else
    log_warning "SSL pulado: domÃƒÂ­nio nÃƒÂ£o informado"
  fi
}

configure_firewall() {
  log "Configurando firewall (UFW)..."
  if ! ufw status | grep -q "Status: active"; then
    ufw --force enable
  fi
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  ufw allow 'Nginx Full'
  ufw allow from 127.0.0.1 to any port 5432
  ufw allow from 127.0.0.1 to any port 6379
  log "Firewall configurado"
}

start_services() {
  log "Iniciando serviÃƒÂ§os..."
  systemctl start ubuntu-server-admin
  systemctl status ubuntu-server-admin --no-pager || true
  log "ServiÃƒÂ§os iniciados"
}

create_admin_script() {
  log "Criando utilitÃƒÂ¡rio serveradmin..."
  cat > /usr/local/bin/serveradmin << 'EOF'
#!/usr/bin/env bash
set -e
case "$1" in
  start) systemctl start ubuntu-server-admin; echo "Iniciado";;
  stop) systemctl stop ubuntu-server-admin; echo "Parado";;
  restart) systemctl restart ubuntu-server-admin; echo "Reiniciado";;
  status) systemctl status ubuntu-server-admin;;
  logs) journalctl -u ubuntu-server-admin -f;;
  update)
    set -e
    cd /opt/ubuntu-server-admin
    current_url=$(git remote get-url origin 2>/dev/null || echo "")
    if [[ -z "$current_url" ]]; then
      git remote add origin https://github.com/Mundo-Do-Software/SERVERADMIN.git || true
    elif [[ "$current_url" =~ ^git@github.com: ]]; then
      https_url=$(echo "$current_url" | sed -E 's#git@github.com:#https://github.com/#')
      git remote set-url origin "$https_url"
    fi
    echo "Atualizando cÃƒÂ³digo..."
    git pull
    echo "Atualizando backend..."
    cd backend
    sudo -u serveradmin bash -c "source venv/bin/activate && pip install -r requirements.txt"
    echo "Atualizando frontend..."
    cd ../frontend/ubuntu-server-admin
    sudo -u serveradmin npm install
    echo "Compilando frontend..."
    if sudo -u serveradmin npx ng build --configuration production ; then
      echo "Ã¢Å“â€¦ Build concluÃƒÂ­do"
    else
      echo "Ã¢Å¡Â Ã¯Â¸Â Build otimizado falhou, tentando bÃƒÂ¡sico..."
      sudo -u serveradmin npx ng build --aot=false --optimization=false 
    fi
    if [[ -d dist/ubuntu-server-admin/browser ]]; then
      rm -rf /var/www/html/serveradmin/browser
      mkdir -p /var/www/html/serveradmin/browser
      cp -r dist/ubuntu-server-admin/browser/* /var/www/html/serveradmin/browser/
      chown -R www-data:www-data /var/www/html/serveradmin
      echo "Ã¢Å“â€¦ Frontend atualizado"
    else
      echo "Ã¢ÂÅ’ Arquivos de build nÃƒÂ£o encontrados"; exit 1
    fi
    systemctl restart ubuntu-server-admin
    systemctl reload nginx
    echo "Ã¢Å“â€¦ AtualizaÃƒÂ§ÃƒÂ£o concluÃƒÂ­da"
    ;;
  health)
    for s in ubuntu-server-admin postgresql redis-server nginx; do
      systemctl is-active --quiet "$s" && echo "Ã¢Å“â€¦ $s: Ativo" || echo "Ã¢ÂÅ’ $s: Inativo"
    done
    ;;
  test)
    python3 --version || echo "Python ausente"
    node --version || echo "Node ausente"
    ;;
  *)
    echo "Uso: serveradmin {start|stop|restart|status|logs|update|health|test}"
    exit 1;;
esac
EOF
  chmod +x /usr/local/bin/serveradmin
  log "UtilitÃƒÂ¡rio criado em /usr/local/bin/serveradmin"
}

show_summary() {
  echo ""
  echo -e "${GREEN}INSTALAÃƒâ€¡ÃƒÆ’O CONCLUÃƒÂDA${NC}"
  echo "DiretÃƒÂ³rio: $INSTALL_DIR"
  echo "UsuÃƒÂ¡rio:   $SERVICE_USER"
  echo "Banco:     $DB_NAME"
  echo "NGINX:     /etc/nginx/sites-available/$NGINX_SITE"
  [[ -n "$PUBLIC_IPV4" ]] && echo "IPv4 pÃƒÂºblico: http://$PUBLIC_IPV4"
  [[ -n "$PUBLIC_IPV6" ]] && echo "IPv6 pÃƒÂºblico: http://[$PUBLIC_IPV6]"
  if [[ "$USE_DOMAIN" == true ]]; then
    echo "Frontend:  http${HTTPS_ENABLED:+s}://$DOMAIN"
    echo "API:       http${HTTPS_ENABLED:+s}://$DOMAIN/api"
  fi
}

# =========================
# CLI
# =========================
parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --domain) DOMAIN="$2"; USE_DOMAIN=true; shift 2;;
      --email) SSL_EMAIL="$2"; shift 2;;
      --directory) INSTALL_DIR="$2"; shift 2;;
      --skip-ssl) SKIP_SSL=true; shift;;
      --auto) AUTO_INSTALL=true; shift;;
      --help|-h) show_help; exit 0;;
      *) echo -e "${RED}ParÃƒÂ¢metro desconhecido: $1${NC}"; show_help; exit 1;;
    esac
  done
}

show_help() {
  echo -e "${BLUE}Ubuntu Server Admin - Script de InstalaÃƒÂ§ÃƒÂ£o${NC}"
  echo "Uso: sudo bash install.sh [--domain DOMÃƒÂNIO] [--email EMAIL] [--directory DIR] [--skip-ssl] [--auto]"
}

main() {
  clear
  echo -e "${PURPLE}Ã¢â€¢â€Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢â€”${NC}"
  echo -e "${PURPLE}Ã¢â€¢â€˜                    Ubuntu Server Admin                          Ã¢â€¢â€˜${NC}"
  echo -e "${PURPLE}Ã¢â€¢â€˜                     Script de InstalaÃƒÂ§ÃƒÂ£o                        Ã¢â€¢â€˜${NC}"
  echo -e "${PURPLE}Ã¢â€¢Å¡Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â${NC}"
  echo ""

  parse_arguments "$@"
  check_root
  check_ubuntu
  check_system_health
  detect_ips

  if [[ "$AUTO_INSTALL" != true ]]; then
    prompt_config
  else
    log "Modo automÃƒÂ¡tico ativado"
  fi

  log "Iniciando instalaÃƒÂ§ÃƒÂ£o..."
  fix_repository_issues
  update_system
  install_python
  install_nodejs
  install_nginx
  install_postgresql
  install_redis
  install_certbot

  create_user
  clone_repository
  setup_backend
  setup_frontend

  create_systemd_service
  configure_nginx

  if [[ "$SKIP_SSL" != true ]]; then
    setup_ssl
  else
    log_warning "ConfiguraÃƒÂ§ÃƒÂ£o SSL pulada"
  fi

  configure_firewall
  start_services
  create_admin_script
  show_summary
#!/usr/bin/env bash
set -Eeuo pipefail

# =========================
# Cores e logging
  main "$@"
fi
