#!/bin/bash

# ==============================================================================
# Ubuntu Server Admin - Script de Instalação
# ==============================================================================
# Este script instala e configura o Ubuntu Server Admin em um servidor Ubuntu
# sem usar Docker. Ideal para instalação em produção.
#
# Requisitos:
# - Ubuntu 20.04+ (testado em 20.04, 22.04, 24.04)
# - Usuário com privilégios sudo
# - Conexão com internet
# - Mínimo 2GB RAM, 10GB espaço livre
#
# Uso: sudo bash install.sh
# ==============================================================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
PROJECT_NAME="ubuntu-server-admin"
INSTALL_DIR="/opt/ubuntu-server-admin"
SERVICE_USER="serveradmin"
DB_NAME="serveradmin"
DB_USER="serveradmin"
NGINX_SITE="serveradmin"
DOMAIN="localhost"
SSL_EMAIL="admin@localhost"

# Flags de controle
SKIP_SSL=false
AUTO_INSTALL=false

# Logs
LOG_FILE="/var/log/ubuntu-server-admin-install.log"

# ==============================================================================
# Funções auxiliares
# ==============================================================================

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    echo "[ERROR] $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
    echo "[INFO] $1" >> "$LOG_FILE"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root ou com sudo"
        exit 1
    fi
}

check_ubuntu() {
    if ! command -v lsb_release &> /dev/null; then
        log_error "Sistema operacional não identificado"
        exit 1
    fi
    
    OS_VERSION=$(lsb_release -rs)
    OS_NAME=$(lsb_release -is)
    
    if [[ "$OS_NAME" != "Ubuntu" ]]; then
        log_error "Este script foi desenvolvido para Ubuntu. Detectado: $OS_NAME"
        exit 1
    fi
    
    if [[ $(echo "$OS_VERSION >= 20.04" | bc -l) -eq 0 ]]; then
        log_error "Ubuntu 20.04+ é necessário. Detectado: $OS_VERSION"
        exit 1
    fi
    
    log "Sistema compatível detectado: $OS_NAME $OS_VERSION"
}

generate_password() {
    openssl rand -base64 32
}

prompt_config() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                  Configuração da Instalação                   ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Configurar domínio
    echo -e "${BLUE}🌐 Configuração do Domínio:${NC}"
    echo "   • Para produção: use seu domínio real (ex: admin.meusite.com)"
    echo "   • Para desenvolvimento: use localhost"
    echo "   • Para acesso local: use o IP do servidor"
    echo ""
    while true; do
        read -p "Digite o domínio para o servidor: " input_domain
        if [[ -z "$input_domain" ]]; then
            echo -e "${YELLOW}⚠️  Domínio não pode estar vazio. Usando localhost como padrão.${NC}"
            DOMAIN="localhost"
            break
        else
            DOMAIN="$input_domain"
            break
        fi
    done
    
    echo ""
    
    # Configurar email SSL
    echo -e "${BLUE}📧 Configuração do Email SSL:${NC}"
    echo "   • Necessário para certificados Let's Encrypt"
    echo "   • Use um email válido que você tenha acesso"
    echo "   • Para localhost, pode usar qualquer email"
    echo ""
    while true; do
        read -p "Digite o email para certificados SSL: " input_email
        if [[ -z "$input_email" ]]; then
            echo -e "${YELLOW}⚠️  Email não pode estar vazio. Usando admin@${DOMAIN} como padrão.${NC}"
            SSL_EMAIL="admin@${DOMAIN}"
            break
        else
            # Validação básica de email
            if [[ "$input_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
                SSL_EMAIL="$input_email"
                break
            else
                echo -e "${RED}❌ Email inválido. Digite um email válido (ex: admin@exemplo.com)${NC}"
            fi
        fi
    done
    
    echo ""
    
    # Configurar diretório
    echo -e "${BLUE}📁 Configuração do Diretório:${NC}"
    echo "   • Diretório onde a aplicação será instalada"
    echo "   • Padrão recomendado: /opt/ubuntu-server-admin"
    echo ""
    read -p "Diretório de instalação (Enter para padrão): " input_dir
    if [[ -z "$input_dir" ]]; then
        INSTALL_DIR="/opt/ubuntu-server-admin"
    else
        INSTALL_DIR="$input_dir"
    fi
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Resumo da Configuração                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${CYAN}🌐 Domínio:${NC}     $DOMAIN"
    echo -e "${CYAN}📧 Email SSL:${NC}   $SSL_EMAIL"
    echo -e "${CYAN}📁 Diretório:${NC}   $INSTALL_DIR"
    echo ""
    
    # Mostrar informações sobre SSL
    if [[ "$DOMAIN" == "localhost" || "$DOMAIN" == "127.0.0.1" ]]; then
        echo -e "${YELLOW}⚠️  Aviso: Usando localhost - certificado SSL automático não será configurado${NC}"
        echo -e "${YELLOW}   Você poderá acessar via HTTP em: http://$DOMAIN${NC}"
    else
        echo -e "${GREEN}✅ Certificado SSL será configurado automaticamente via Let's Encrypt${NC}"
        echo -e "${GREEN}   Você poderá acessar via HTTPS em: https://$DOMAIN${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📋 O que será instalado:${NC}"
    echo "   • Python 3.11 + FastAPI"
    echo "   • Node.js 20 + Angular"
    echo "   • PostgreSQL (banco de dados)"
    echo "   • Redis (cache)"
    echo "   • NGINX (proxy reverso)"
    echo "   • Certbot (certificados SSL)"
    echo "   • Firewall UFW configurado"
    echo ""
    
    while true; do
        read -p "Continuar com esta configuração? (s/N): " confirm
        case "$confirm" in
            [Ss]|[Ss][Ii][Mm]|[Yy]|[Yy][Ee][Ss])
                echo -e "${GREEN}✅ Configuração confirmada! Iniciando instalação...${NC}"
                echo ""
                break
                ;;
            [Nn]|[Nn][Aa][Oo]|[Nn][Oo]|"")
                echo -e "${YELLOW}❌ Instalação cancelada pelo usuário${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Por favor, digite 's' para sim ou 'n' para não${NC}"
                ;;
        esac
    done
}

# ==============================================================================
# Instalação do Sistema
# ==============================================================================

update_system() {
    log "Atualizando sistema..."
    
    # Corrigir problema do apt_pkg se existir
    if ! python3 -c "import apt_pkg" 2>/dev/null; then
        log_warning "Corrigindo problema do apt_pkg..."
        apt install -y --reinstall python3-apt
    fi
    
    # Limpar cache do apt para evitar problemas
    apt clean
    apt autoremove -y
    
    # Atualizar sistema
    apt update -qq
    apt upgrade -y -qq
    apt install -y software-properties-common curl wget git unzip bc
}

install_python() {
    log "Instalando Python 3.11..."
    add-apt-repository ppa:deadsnakes/ppa -y
    apt update -qq
    apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
    
    # Criar link simbólico
    ln -sf /usr/bin/python3.11 /usr/bin/python3
    
    # Atualizar pip (com tratamento de erro)
    log_warning "Atualizando pip (ignorando erros de dependências do sistema)..."
    python3 -m pip install --upgrade pip --break-system-packages 2>/dev/null || {
        log_warning "Upgrade do pip falhou (normal no Ubuntu), usando pip existente"
        # Verificar se pip funciona
        if ! python3 -m pip --version &>/dev/null; then
            log_error "Pip não está funcionando, reinstalando..."
            curl -sSL https://bootstrap.pypa.io/get-pip.py | python3 --break-system-packages
        fi
    }
    
    log "Python $(python3 --version) instalado"
}

install_nodejs() {
    log "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    
    # Instalar Angular CLI globalmente
    npm install -g @angular/cli@latest
    
    log "Node.js $(node --version) e npm $(npm --version) instalados"
}

install_nginx() {
    log "Instalando NGINX..."
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    
    # Configurar firewall
    ufw allow 'Nginx Full'
    
    log "NGINX instalado e configurado"
}

install_postgresql() {
    log "Instalando PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    
    # Gerar senha para o banco
    DB_PASSWORD=$(generate_password)
    
    # Configurar banco de dados
    sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
    
    log "PostgreSQL instalado e banco configurado"
}

install_redis() {
    log "Instalando Redis..."
    apt install -y redis-server
    
    # Configurar Redis
    sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
    systemctl enable redis-server
    systemctl restart redis-server
    
    log "Redis instalado e configurado"
}

install_certbot() {
    log "Instalando Certbot..."
    apt install -y certbot python3-certbot-nginx
    
    log "Certbot instalado"
}

# ==============================================================================
# Configuração do Usuário e Aplicação
# ==============================================================================

create_user() {
    log "Criando usuário do sistema..."
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -s /bin/bash -d "$INSTALL_DIR" -m "$SERVICE_USER"
        log "Usuário $SERVICE_USER criado"
    else
        log "Usuário $SERVICE_USER já existe"
    fi
}

clone_repository() {
    log "Clonando repositório..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_warning "Diretório $INSTALL_DIR já existe. Fazendo backup..."
        mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git "$INSTALL_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    
    log "Repositório clonado em $INSTALL_DIR"
}

setup_backend() {
    log "Configurando backend Python..."
    
    cd "$INSTALL_DIR/backend"
    
    # Criar ambiente virtual
    sudo -u "$SERVICE_USER" python3 -m venv venv
    
    # Ativar ambiente e instalar dependências
    sudo -u "$SERVICE_USER" bash -c "source venv/bin/activate && pip install -r requirements.txt"
    
    # Criar arquivo de configuração
    cat > .env << EOF
# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost/$DB_NAME

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=$(generate_password)
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Admin User
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false

# CORS
CORS_ORIGINS=http://localhost,http://$DOMAIN,https://$DOMAIN
EOF
    
    chown "$SERVICE_USER:$SERVICE_USER" .env
    chmod 600 .env
    
    log "Backend configurado"
}

setup_frontend() {
    log "Configurando frontend Angular..."
    
    cd "$INSTALL_DIR/frontend/ubuntu-server-admin"
    
    # Instalar dependências
    sudo -u "$SERVICE_USER" npm install
    
    # Configurar ambiente de produção
    sudo -u "$SERVICE_USER" cat > src/environments/environment.prod.ts << EOF
export const environment = {
  production: true,
  apiUrl: 'https://$DOMAIN/api'
};
EOF
    
    # Build para produção
    sudo -u "$SERVICE_USER" npm run build
    
    # Mover arquivos para diretório do NGINX
    rm -rf /var/www/html/serveradmin
    mkdir -p /var/www/html/serveradmin
    cp -r dist/ubuntu-server-admin/* /var/www/html/serveradmin/
    chown -R www-data:www-data /var/www/html/serveradmin
    
    log "Frontend compilado e configurado"
}

# ==============================================================================
# Configuração de Serviços
# ==============================================================================

create_systemd_service() {
    log "Criando serviço systemd..."
    
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
    
    log "Serviço systemd criado"
}

configure_nginx() {
    log "Configurando NGINX..."
    
    cat > /etc/nginx/sites-available/$NGINX_SITE << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Configuration (will be configured by Certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend (Angular)
    location / {
        root /var/www/html/serveradmin;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
    }
    
    # Security
    location ~ /\. {
        deny all;
    }
    
    # Logs
    access_log /var/log/nginx/serveradmin.access.log;
    error_log /var/log/nginx/serveradmin.error.log;
}
EOF
    
    # Ativar site
    ln -sf /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-enabled/
    
    # Remover site padrão
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    nginx -t
    systemctl reload nginx
    
    log "NGINX configurado"
}

setup_ssl() {
    log "Configurando certificado SSL..."
    
    if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" ]]; then
        # Obter certificado SSL real
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL"
        
        # Configurar renovação automática
        systemctl enable certbot.timer
        systemctl start certbot.timer
        
        log "Certificado SSL configurado para $DOMAIN"
    else
        log_warning "Certificado SSL não configurado para localhost"
    fi
}

configure_firewall() {
    log "Configurando firewall..."
    
    # Ativar UFW se não estiver ativo
    if ! ufw status | grep -q "Status: active"; then
        ufw --force enable
    fi
    
    # Regras básicas
    ufw default deny incoming
    ufw default allow outgoing
    
    # Permitir SSH
    ufw allow ssh
    
    # Permitir HTTP/HTTPS
    ufw allow 'Nginx Full'
    
    # Permitir PostgreSQL apenas localmente
    ufw allow from 127.0.0.1 to any port 5432
    
    # Permitir Redis apenas localmente
    ufw allow from 127.0.0.1 to any port 6379
    
    log "Firewall configurado"
}

# ==============================================================================
# Finalização
# ==============================================================================

start_services() {
    log "Iniciando serviços..."
    
    systemctl start ubuntu-server-admin
    systemctl status ubuntu-server-admin --no-pager
    
    log "Serviços iniciados"
}

create_admin_script() {
    log "Criando scripts de administração..."
    
    cat > /usr/local/bin/serveradmin << 'EOF'
#!/bin/bash

case "$1" in
    start)
        systemctl start ubuntu-server-admin
        echo "Ubuntu Server Admin iniciado"
        ;;
    stop)
        systemctl stop ubuntu-server-admin
        echo "Ubuntu Server Admin parado"
        ;;
    restart)
        systemctl restart ubuntu-server-admin
        echo "Ubuntu Server Admin reiniciado"
        ;;
    status)
        systemctl status ubuntu-server-admin
        ;;
    logs)
        journalctl -u ubuntu-server-admin -f
        ;;
    update)
        cd /opt/ubuntu-server-admin
        git pull
        cd backend
        sudo -u serveradmin bash -c "source venv/bin/activate && pip install -r requirements.txt"
        cd ../frontend/ubuntu-server-admin
        sudo -u serveradmin npm install
        sudo -u serveradmin npm run build
        cp -r dist/ubuntu-server-admin/* /var/www/html/serveradmin/
        chown -R www-data:www-data /var/www/html/serveradmin
        systemctl restart ubuntu-server-admin
        systemctl reload nginx
        echo "Ubuntu Server Admin atualizado"
        ;;
    *)
        echo "Uso: serveradmin {start|stop|restart|status|logs|update}"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/serveradmin
    
    log "Script de administração criado: /usr/local/bin/serveradmin"
}

show_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                   INSTALAÇÃO CONCLUÍDA                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${CYAN}📋 Informações do Sistema:${NC}"
    echo "   • Diretório: $INSTALL_DIR"
    echo "   • Usuário: $SERVICE_USER"
    echo "   • Banco: PostgreSQL ($DB_NAME)"
    echo "   • Cache: Redis"
    echo "   • Web Server: NGINX"
    echo ""
    
    echo -e "${CYAN}🌐 URLs de Acesso:${NC}"
    if [[ "$DOMAIN" == "localhost" || "$DOMAIN" == "127.0.0.1" ]]; then
        echo "   • Frontend: http://$DOMAIN"
        echo "   • API: http://$DOMAIN/api"
        echo "   • Documentação: http://$DOMAIN/api/docs"
    else
        echo "   • Frontend: https://$DOMAIN"
        echo "   • API: https://$DOMAIN/api"
        echo "   • Documentação: https://$DOMAIN/api/docs"
    fi
    echo ""
    
    echo -e "${CYAN}🔐 Credenciais Padrão:${NC}"
    echo "   • Usuário: admin"
    echo "   • Senha: admin123"
    echo -e "${YELLOW}   ⚠️  ALTERE ESSAS CREDENCIAIS APÓS O PRIMEIRO LOGIN!${NC}"
    echo ""
    
    echo -e "${CYAN}⚡ Comandos de Gerenciamento:${NC}"
    echo "   • Iniciar:     serveradmin start"
    echo "   • Parar:       serveradmin stop"
    echo "   • Reiniciar:   serveradmin restart"
    echo "   • Status:      serveradmin status"
    echo "   • Logs:        serveradmin logs"
    echo "   • Atualizar:   serveradmin update"
    echo "   • Saúde:       serveradmin health"
    echo ""
    
    echo -e "${CYAN}📁 Arquivos de Configuração:${NC}"
    echo "   • Backend:     $INSTALL_DIR/backend/.env"
    echo "   • NGINX:       /etc/nginx/sites-available/$NGINX_SITE"
    echo "   • Serviço:     /etc/systemd/system/ubuntu-server-admin.service"
    echo "   • Logs:        /var/log/ubuntu-server-admin-install.log"
    echo ""
    
    echo -e "${CYAN}🛡️ Configuração de Segurança:${NC}"
    if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" && "$SKIP_SSL" != true ]]; then
        echo "   • SSL/TLS:     ✅ Configurado via Let's Encrypt"
        echo "   • Domínio:     $DOMAIN"
        echo "   • Email SSL:   $SSL_EMAIL"
        echo "   • Renovação:   Automática (certbot.timer)"
    else
        echo "   • SSL/TLS:     ❌ Não configurado (localhost ou --skip-ssl)"
        echo "   • Acesso:      HTTP apenas"
    fi
    echo "   • Firewall:    ✅ UFW ativo"
    echo "   • Portas:      22 (SSH), 80 (HTTP), 443 (HTTPS)"
    echo ""
    
    echo -e "${CYAN}📊 Status dos Serviços:${NC}"
    local services=("ubuntu-server-admin" "postgresql" "redis-server" "nginx")
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            echo "   • $service: ✅ Ativo"
        else
            echo "   • $service: ❌ Inativo"
        fi
    done
    echo ""
    
    echo -e "${YELLOW}🔧 Próximos Passos:${NC}"
    echo "   1. Acesse a aplicação usando as URLs acima"
    echo "   2. Faça login com as credenciais padrão"
    echo "   3. ALTERE a senha do administrador"
    echo "   4. Configure backup do banco de dados"
    echo "   5. Configure monitoramento dos logs"
    echo ""
    
    echo -e "${YELLOW}📚 Documentação:${NC}"
    echo "   • Instalação: $INSTALL_DIR/INSTALLATION.md"
    echo "   • Scripts:    $INSTALL_DIR/SCRIPTS.md"
    echo "   • GitHub:     https://github.com/Mundo-Do-Software/SERVERADMIN"
    echo ""
    
    echo -e "${GREEN}🎉 Ubuntu Server Admin instalado com sucesso!${NC}"
    
    if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" ]]; then
        echo -e "${BLUE}🌍 Acesse agora: https://$DOMAIN${NC}"
    else
        echo -e "${BLUE}🏠 Acesse agora: http://$DOMAIN${NC}"
    fi
    echo ""
}

# ==============================================================================
# Função Principal
# ==============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --email)
                SSL_EMAIL="$2"
                shift 2
                ;;
            --directory)
                INSTALL_DIR="$2"
                shift 2
                ;;
            --skip-ssl)
                SKIP_SSL=true
                shift
                ;;
            --auto)
                AUTO_INSTALL=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo -e "${RED}Parâmetro desconhecido: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    echo -e "${BLUE}Ubuntu Server Admin - Script de Instalação${NC}"
    echo ""
    echo "Uso: sudo bash install.sh [OPTIONS]"
    echo ""
    echo "Opções:"
    echo "  --domain DOMAIN     Domínio para o servidor (ex: admin.exemplo.com)"
    echo "  --email EMAIL       Email para certificados SSL"
    echo "  --directory DIR     Diretório de instalação (padrão: /opt/ubuntu-server-admin)"
    echo "  --skip-ssl          Pular configuração SSL"
    echo "  --auto              Instalação automática sem prompts"
    echo "  --help, -h          Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  # Instalação interativa"
    echo "  sudo bash install.sh"
    echo ""
    echo "  # Instalação para produção"
    echo "  sudo bash install.sh --domain admin.meusite.com --email admin@meusite.com"
    echo ""
    echo "  # Instalação para desenvolvimento"
    echo "  sudo bash install.sh --domain localhost --email admin@localhost --skip-ssl"
    echo ""
    echo "  # Instalação automática"
    echo "  sudo bash install.sh --domain exemplo.com --email admin@exemplo.com --auto"
}

main() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    Ubuntu Server Admin                          ║"
    echo "║                     Script de Instalação                        ║"
    echo "║                                                                  ║"
    echo "║  Instalação completa sem Docker para servidores Ubuntu          ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    # Parse argumentos da linha de comando
    parse_arguments "$@"
    
    # Verificações iniciais
    check_root
    check_ubuntu
    
    # Configuração (pular se modo automático)
    if [[ "$AUTO_INSTALL" != true ]]; then
        prompt_config
    else
        log "Modo automático ativado - usando configurações fornecidas"
        echo -e "${GREEN}Configuração automática:${NC}"
        echo "  • Domínio: $DOMAIN"
        echo "  • Email SSL: $SSL_EMAIL"
        echo "  • Diretório: $INSTALL_DIR"
        echo ""
    fi
    
    log "Iniciando instalação do Ubuntu Server Admin..."
    
    # Instalação do sistema
    update_system
    install_python
    install_nodejs
    install_nginx
    install_postgresql
    install_redis
    install_certbot
    
    # Configuração da aplicação
    create_user
    clone_repository
    setup_backend
    setup_frontend
    
    # Configuração de serviços
    create_systemd_service
    configure_nginx
    
    # Configurar SSL apenas se não for pulado
    if [[ "$SKIP_SSL" != true ]]; then
        setup_ssl
    else
        log_warning "Configuração SSL pulada conforme solicitado"
    fi
    
    configure_firewall
    
    # Finalização
    start_services
    create_admin_script
    show_summary
    
    log "Instalação concluída com sucesso!"
}

# Executar apenas se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
