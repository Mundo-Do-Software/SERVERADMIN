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
DOMAIN=""
SSL_EMAIL=""
USE_DOMAIN=false
HTTPS_ENABLED=false

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

# Detecção de IPs (locais e públicos)
detect_ips() {
    log "Detectando endereços IPv4/IPv6 locais e públicos..."

    # Locais (globais) IPv4
    LOCAL_IPV4S=$(ip -4 addr show scope global 2>/dev/null | awk '/inet /{print $2}' | cut -d'/' -f1 | tr '\n' ' ' | sed 's/ *$//')
    # Locais (globais) IPv6
    LOCAL_IPV6S=$(ip -6 addr show scope global 2>/dev/null | awk '/inet6 /{print $2}' | cut -d'/' -f1 | tr '\n' ' ' | sed 's/ *$//')

    # Públicos
    PUBLIC_IPV4=$(curl -4 -fsS https://ifconfig.co 2>/dev/null || curl -4 -fsS https://api.ipify.org 2>/dev/null || true)
    PUBLIC_IPV6=$(curl -6 -fsS https://ifconfig.co 2>/dev/null || curl -6 -fsS https://api64.ipify.org 2>/dev/null || true)

    [[ -z "$PUBLIC_IPV4" ]] && log_warning "Não foi possível detectar IPv4 público"
    [[ -z "$PUBLIC_IPV6" ]] && log_warning "Não foi possível detectar IPv6 público"

    log_info "IPv4 local(ais): ${LOCAL_IPV4S:-nenhum}"
    log_info "IPv6 local(ais): ${LOCAL_IPV6S:-nenhum}"
    log_info "IPv4 público: ${PUBLIC_IPV4:-desconhecido}"
    log_info "IPv6 público: ${PUBLIC_IPV6:-desconhecido}"
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

check_system_health() {
    log "Verificando saúde do sistema..."
    
    # Verificar espaço em disco
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=10485760  # 10GB em KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_error "Espaço insuficiente em disco. Necessário: 10GB, Disponível: $(($available_space/1024/1024))GB"
        exit 1
    fi
    
    # Verificar memória RAM
    local available_ram=$(free -m | awk 'NR==2{print $7}')
    local required_ram=1024  # 1GB
    
    if [[ $available_ram -lt $required_ram ]]; then
        log_warning "RAM disponível baixa: ${available_ram}MB (recomendado: 2GB+)"
    fi
    
    # Verificar conectividade
    if ! ping -c 1 8.8.8.8 &>/dev/null; then
        log_error "Sem conexão com a internet"
        exit 1
    fi
    
    # Verificar se portas necessárias estão livres
    local ports=(80 443 5432 6379 8000)
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_warning "Porta $port já está em uso"
        fi
    done
    
    # Verificar problemas conhecidos do Ubuntu
    if [[ -f /usr/lib/cnf-update-db && ! -x /usr/lib/cnf-update-db ]]; then
        log_warning "Detectado problema com command-not-found"
    fi
    
    # Verificar status do apt_pkg
    if ! python3 -c "import apt_pkg" 2>/dev/null; then
        log_warning "Detectado problema com apt_pkg (será corrigido automaticamente)"
    fi
    
    log "Verificação de saúde concluída"
}

fix_repository_issues() {
    log "Verificando e corrigindo problemas de repositórios..."
    
    # Backup da lista de sources
    cp /etc/apt/sources.list /etc/apt/sources.list.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Corrigir problemas de lock
    if [[ -f /var/lib/dpkg/lock-frontend ]]; then
        log_warning "Removendo locks do dpkg..."
        rm -f /var/lib/dpkg/lock-frontend
        rm -f /var/lib/dpkg/lock
        rm -f /var/cache/apt/archives/lock
    fi
    
    # Reconfigurar dpkg se necessário
    dpkg --configure -a 2>/dev/null || true
    
    # Limpar cache completamente
    apt clean
    apt autoclean
    
    # Verificar integridade dos repositórios
    if ! apt update -qq 2>/dev/null; then
        log_warning "Problemas detectados nos repositórios, tentando correção..."
        
        # Tentar reparar repositórios
        apt-get clean
        apt-get update --fix-missing
        
        # Se ainda falhar, regenerar lista básica
        if ! apt update -qq 2>/dev/null; then
            log_warning "Regenerando lista básica de repositórios..."
            local codename=$(lsb_release -cs)
            cat > /etc/apt/sources.list << EOF
# Ubuntu Official Repositories
deb http://archive.ubuntu.com/ubuntu/ $codename main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $codename-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $codename-security main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ $codename-backports main restricted universe multiverse
EOF
            apt update -qq
        fi
    fi
    
    log "Repositórios verificados e corrigidos"
}

setup_ssh_for_git() {
    log "Configurando SSH para Git (se necessário)..."
    
    # Verificar se já existe chave SSH
    if [[ ! -f ~/.ssh/id_ed25519 && ! -f ~/.ssh/id_rsa ]]; then
        log_info "Gerando chave SSH para Git..."
        
        # Criar diretório SSH se não existir
        mkdir -p ~/.ssh
        chmod 700 ~/.ssh
        
        # Gerar chave SSH
        ssh-keygen -t ed25519 -C "serveradmin@$(hostname)" -f ~/.ssh/id_ed25519 -N "" 2>/dev/null
        
        # Configurar permissões
        chmod 600 ~/.ssh/id_ed25519
        chmod 644 ~/.ssh/id_ed25519.pub
        
        # Adicionar ao ssh-agent
        eval "$(ssh-agent -s)" 2>/dev/null
        ssh-add ~/.ssh/id_ed25519 2>/dev/null
        
        # Configurar SSH para GitHub
        cat >> ~/.ssh/config << EOF

# GitHub configuration
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    StrictHostKeyChecking no
EOF
        chmod 600 ~/.ssh/config
        
        log_warning "Chave SSH gerada: ~/.ssh/id_ed25519.pub"
        log_warning "Adicione esta chave ao GitHub antes de continuar:"
        echo ""
        echo -e "${CYAN}======== CHAVE SSH PÚBLICA ========${NC}"
        cat ~/.ssh/id_ed25519.pub
        echo -e "${CYAN}=====================================${NC}"
        echo ""
        log_warning "1. Copie a chave acima"
        log_warning "2. Acesse: https://github.com/settings/ssh/new"
        log_warning "3. Cole a chave e salve"
        echo ""
        
        while true; do
            read -p "Chave SSH adicionada ao GitHub? (s/N): " ssh_added
            case "$ssh_added" in
                [Ss]|[Ss][Ii][Mm]|[Yy]|[Yy][Ee][Ss])
                    break
                    ;;
                [Nn]|[Nn][Aa][Oo]|[Nn][Oo]|"")
                    log_warning "Clone continuará via HTTPS (pode solicitar credenciais)"
                    break
                    ;;
                *)
                    echo -e "${RED}Por favor, digite 's' para sim ou 'n' para não${NC}"
                    ;;
            esac
        done
    else
        log "Chave SSH já existe"
    fi
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
    echo -e "${BLUE}🌐 Configuração do Domínio (opcional):${NC}"
    echo "   • Você pode pular e usar apenas IP e portas por enquanto."
    echo "   • Configure o domínio depois, quando desejar habilitar SSL."
    echo ""
    read -p "Digite o domínio (ou deixe em branco para pular): " input_domain
    if [[ -n "$input_domain" ]]; then
        DOMAIN="$input_domain"
        USE_DOMAIN=true
    else
        DOMAIN=""
        USE_DOMAIN=false
    fi
    
    echo ""
    
    # Configurar email SSL
    if [[ "$USE_DOMAIN" == true ]]; then
        echo -e "${BLUE}📧 Configuração do Email SSL:${NC}"
        echo "   • Necessário para certificados Let's Encrypt"
        while true; do
            read -p "Digite o email para certificados SSL: " input_email
            if [[ -z "$input_email" ]]; then
                echo -e "${YELLOW}⚠️  Email não pode estar vazio. Usando admin@${DOMAIN} como padrão.${NC}"
                SSL_EMAIL="admin@${DOMAIN}"
                break
            else
                if [[ "$input_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
                    SSL_EMAIL="$input_email"
                    break
                else
                    echo -e "${RED}❌ Email inválido. Digite um email válido (ex: admin@exemplo.com)${NC}"
                fi
            fi
        done
    fi
    
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
        echo -e "${CYAN}🌐 Domínio:${NC}     ${DOMAIN:-(não configurado)}"
        if [[ "$USE_DOMAIN" == true ]]; then
            echo -e "${CYAN}📧 Email SSL:${NC}   $SSL_EMAIL"
        fi
    echo -e "${CYAN}📁 Diretório:${NC}   $INSTALL_DIR"
    echo ""
    
    # Mostrar informações sobre SSL
    if [[ "$USE_DOMAIN" == true ]]; then
        echo -e "${GREEN}✅ Domínio informado. Você poderá habilitar SSL após a instalação.${NC}"
        echo -e "${GREEN}   Acesso previsto: https://$DOMAIN (quando SSL ativo)${NC}"
    else
        echo -e "${YELLOW}ℹ️  Nenhum domínio configurado. O acesso será por IP e porta 80 (HTTP).${NC}"
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
    
    # Configurar frontend não-interativo para evitar prompts
    export DEBIAN_FRONTEND=noninteractive
    export APT_LISTCHANGES_FRONTEND=none
    
    # Corrigir problema do apt_pkg e command-not-found de forma mais robusta
    log_warning "Verificando e corrigindo dependências do sistema..."
    
    # Desabilitar temporariamente command-not-found para evitar interferências
    if [[ -x /usr/lib/cnf-update-db ]]; then
        chmod -x /usr/lib/cnf-update-db 2>/dev/null || true
        log_warning "command-not-found temporariamente desabilitado"
    fi
    
    # Limpar cache e corrigir problemas de dependências
    apt clean
    apt autoremove -y --purge
    
    # Corrigir problemas de configuração do dpkg
    dpkg --configure -a 2>/dev/null || true
    
    # Atualizar lista de pacotes
    log "Atualizando lista de pacotes..."
    apt update -qq 2>/dev/null || {
        log_warning "Primeira tentativa de update falhou, limpando cache e tentando novamente..."
        apt clean
        apt update -qq
    }
    
    # Atualizar sistema
    log "Atualizando pacotes do sistema..."
    apt upgrade -y -qq 2>/dev/null || apt upgrade -y -qq
    
    # Instalar dependências essenciais
    log "Instalando dependências essenciais..."
    apt install -y software-properties-common curl wget git unzip bc
    
    # Corrigir especificamente o problema do apt_pkg
    if ! python3 -c "import apt_pkg" 2>/dev/null; then
        log_warning "Corrigindo problema do apt_pkg..."
        apt install -y --reinstall python3-apt python3-software-properties
        
        # Se ainda tiver problema, tentar com force
        if ! python3 -c "import apt_pkg" 2>/dev/null; then
            log_warning "Problema persistente com apt_pkg, aplicando correção forçada..."
            apt install -y --reinstall --fix-broken python3-apt
            apt install -y --reinstall --fix-missing python3-software-properties
        fi
    fi
    
    # Reabilitar command-not-found se foi desabilitado
    if [[ ! -x /usr/lib/cnf-update-db && -f /usr/lib/cnf-update-db ]]; then
        log_warning "Reabilitando command-not-found..."
        chmod +x /usr/lib/cnf-update-db 2>/dev/null || true
    fi
    
    # Verificar se as dependências críticas estão funcionando
    if python3 -c "import apt_pkg" 2>/dev/null; then
        log "✅ apt_pkg funcionando corretamente"
    else
        log_warning "⚠️ apt_pkg ainda com problemas, mas continuando instalação"
    fi
    
    log "Sistema atualizado com sucesso"
}

install_python() {
    log "Instalando Python 3.11..."
    
    # Corrigir problemas do apt_pkg antes de adicionar repositórios
    log_warning "Corrigindo dependências do apt_pkg para add-apt-repository..."
    DEBIAN_FRONTEND=noninteractive apt install -y --reinstall python3-apt python3-software-properties
    
    # Tentar adicionar repositório com tratamento de erro
    if ! add-apt-repository ppa:deadsnakes/ppa -y 2>/dev/null; then
        log_warning "add-apt-repository falhou, tentando método alternativo..."
        
        # Método alternativo: adicionar manualmente o repositório
        echo "deb http://ppa.launchpad.net/deadsnakes/ppa/ubuntu $(lsb_release -cs) main" > /etc/apt/sources.list.d/deadsnakes-ppa.list
        echo "deb-src http://ppa.launchpad.net/deadsnakes/ppa/ubuntu $(lsb_release -cs) main" >> /etc/apt/sources.list.d/deadsnakes-ppa.list
        
        # Adicionar chave GPG
        apt-key adv --keyserver keyserver.ubuntu.com --recv-keys F23C5A6CF475977595C89F51BA6932366A755776 2>/dev/null || {
            log_warning "Falha ao adicionar chave GPG, tentando método alternativo..."
            curl -fsSL https://keyserver.ubuntu.com/pks/lookup?op=get\&search=0xF23C5A6CF475977595C89F51BA6932366A755776 | apt-key add -
        }
    fi
    
    # Atualizar lista de pacotes
    apt update -qq 2>/dev/null || apt update -qq
    
    # Instalar Python 3.11
    if apt install -y python3.11 python3.11-venv python3.11-dev python3-pip; then
        log "Python 3.11 instalado com sucesso"
    else
        log_warning "Falha na instalação do Python 3.11, tentando usar Python padrão do sistema..."
        # Usar Python padrão se 3.11 não estiver disponível
        apt install -y python3 python3-venv python3-dev python3-pip
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        log_warning "Usando Python $PYTHON_VERSION do sistema"
    fi
    
    # Criar link simbólico se Python 3.11 foi instalado
    if command -v python3.11 &> /dev/null; then
        ln -sf /usr/bin/python3.11 /usr/bin/python3
    fi
    
    # Atualizar pip (com tratamento de erro robusto)
    log_warning "Configurando pip..."
    if python3 -m pip install --upgrade pip --break-system-packages 2>/dev/null; then
        log "Pip atualizado com sucesso"
    else
        log_warning "Upgrade do pip falhou, verificando instalação..."
        if ! python3 -m pip --version &>/dev/null; then
            log_warning "Pip não está funcionando, reinstalando..."
            # Download e instalação manual do pip
            curl -sSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
            python3 /tmp/get-pip.py --break-system-packages --force-reinstall
            rm -f /tmp/get-pip.py
        fi
    fi
    
    # Verificar instalação final
    PYTHON_VERSION=$(python3 --version 2>/dev/null || echo "Versão não detectada")
    PIP_VERSION=$(python3 -m pip --version 2>/dev/null | cut -d' ' -f2 || echo "não detectada")
    log "Python instalado: $PYTHON_VERSION"
    log "Pip instalado: versão $PIP_VERSION"
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
    
    # Verificar se SSH está configurado
    log_info "Verificando configuração SSH..."
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        log_info "SSH configurado corretamente, clonando via SSH..."
        if git clone git@github.com:Mundo-Do-Software/SERVERADMIN.git "$INSTALL_DIR" 2>/dev/null; then
            log "Repositório clonado via SSH"
        else
            log_warning "Clone via SSH falhou mesmo com autenticação, tentando HTTPS..."
            if git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git "$INSTALL_DIR"; then
                log "Repositório clonado via HTTPS"
                log_warning "Para futuras atualizações, configure SSH corretamente"
            else
                log_error "Falha ao clonar repositório"
                exit 1
            fi
        fi
    else
        log_warning "SSH não configurado ou não funcionando, usando HTTPS..."
        if git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git "$INSTALL_DIR"; then
            log "Repositório clonado via HTTPS"
            log_warning "Para evitar solicitar credenciais no futuro, configure SSH:"
            log_warning "  1. ssh-keygen -t ed25519 -C 'your-email@domain.com'"
            log_warning "  2. cat ~/.ssh/id_ed25519.pub  # Adicione ao GitHub"
            log_warning "  3. ssh -T git@github.com  # Teste a conexão"
        else
            log_error "Falha ao clonar repositório"
            exit 1
        fi
    fi
    
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
    # Prepara variáveis de rede
    local api_host="0.0.0.0"
    local api_port="8000"
    local domain_value="${DOMAIN:-}"

    # Gerar chave JWT forte
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
HOST=$api_host
PORT=$api_port
DEBUG=false

# CORS (IP e domínio, quando disponível)
CORS_ORIGINS=http://localhost,http://127.0.0.1,http://[::1],http://$PUBLIC_IPV4,http://$PUBLIC_IPV6,http://$domain_value,https://$domain_value
# Descoberta de rede (informativo)
PUBLIC_IPV4=${PUBLIC_IPV4}
PUBLIC_IPV6=${PUBLIC_IPV6}
LOCAL_IPV4S=${LOCAL_IPV4S}
LOCAL_IPV6S=${LOCAL_IPV6S}
DOMAIN=${domain_value}
EOF
    
    chown "$SERVICE_USER:$SERVICE_USER" .env
    chmod 600 .env
    
    log "Backend configurado"
}

setup_frontend() {
    log "Configurando frontend Angular..."
    
    cd "$INSTALL_DIR/frontend/ubuntu-server-admin"
    
    # Instalar dependências
    log_info "Instalando dependências do Node.js..."
    sudo -u "$SERVICE_USER" npm install
    
    # Configurar ambiente de produção
    log_info "Configurando ambiente de produção..."
        # Base URLs: por padrão apontar para o mesmo host/origem (Nginx proxy em /api/v1)
        sudo -u "$SERVICE_USER" cat > src/environments/environment.prod.ts << EOF
export const environment = {
  production: true,
    // Chamadas irão para o mesmo host via NGINX: /api/v1
    apiUrl: '/api/v1',
    apiBaseUrl: '/api',
    // Para referência/diagnóstico na UI ou futuras configs
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
    
    # Limpar cache do Angular se necessário
    log_info "Limpando cache do Angular..."
    sudo -u "$SERVICE_USER" npx ng cache clean 2>/dev/null || true
    
    # Build para produção com retry
    log_info "Compilando aplicação Angular para produção..."
    local build_attempts=0
    local max_attempts=3
    
    while [ $build_attempts -lt $max_attempts ]; do
        build_attempts=$((build_attempts + 1))
        log_info "Tentativa de build $build_attempts/$max_attempts..."
        
        if sudo -u "$SERVICE_USER" npm run build -- --configuration=production 2>&1; then
            log "Build do Angular concluído com sucesso"
            break
        else
            log_warning "Build falhou na tentativa $build_attempts"
            
            if [ $build_attempts -eq $max_attempts ]; then
                log_error "Build do Angular falhou após $max_attempts tentativas"
                log_error "Verifique os logs acima para detalhes do erro"
                
                # Tentar build básico como fallback
                log_warning "Tentando build básico como fallback..."
                if sudo -u "$SERVICE_USER" npx ng build --aot=false --optimization=false 2>&1; then
                    log_warning "Build básico concluído (sem otimizações)"
                    break
                else
                    log_error "Build básico também falhou. Abortando instalação."
                    exit 1
                fi
            else
                log_info "Aguardando 5 segundos antes da próxima tentativa..."
                sleep 5
                
                # Limpar node_modules e reinstalar em caso de erro persistente
                if [ $build_attempts -eq 2 ]; then
                    log_warning "Limpando node_modules e reinstalando dependências..."
                    sudo -u "$SERVICE_USER" rm -rf node_modules package-lock.json
                    sudo -u "$SERVICE_USER" npm install
                fi
            fi
        fi
    done
    
    # Verificar se o build foi gerado
    if [[ ! -d "dist/ubuntu-server-admin" ]]; then
        log_error "Diretório de build não foi gerado. Verificando estrutura..."
        
        # Listar conteúdo do diretório dist
        if [[ -d "dist" ]]; then
            log_info "Conteúdo do diretório dist:"
            ls -la dist/
            
            # Procurar por qualquer diretório gerado
            BUILD_DIR=$(find dist/ -type d -name "*ubuntu*" | head -1)
            if [[ -n "$BUILD_DIR" ]]; then
                log_warning "Usando diretório de build encontrado: $BUILD_DIR"
                mv "$BUILD_DIR" dist/ubuntu-server-admin/
            fi
        fi
        
        if [[ ! -d "dist/ubuntu-server-admin" ]]; then
            log_error "Falha crítica: Não foi possível gerar build do frontend"
            exit 1
        fi
    fi
    
    # Verificar se o build foi criado
    if [[ ! -d "dist/ubuntu-server-admin" ]]; then
        log_error "Diretório dist/ubuntu-server-admin não encontrado após o build"
        log_error "Conteúdo do diretório atual:"
        ls -la
        if [[ -d "dist" ]]; then
            log_error "Conteúdo do diretório dist:"
            ls -la dist/
        fi
        exit 1
    fi
    
    # Mover arquivos para diretório do NGINX
    log_info "Instalando arquivos do frontend..."
    rm -rf /var/www/html/serveradmin
    mkdir -p /var/www/html/serveradmin/browser
    
    # Copiar arquivos com verificação de erro
    if [[ -d "dist/ubuntu-server-admin/browser" ]]; then
        cp -r dist/ubuntu-server-admin/browser/* /var/www/html/serveradmin/browser/
    else
        cp -r dist/ubuntu-server-admin/* /var/www/html/serveradmin/browser/
    fi
    if [[ $? -eq 0 ]]; then
        chown -R www-data:www-data /var/www/html/serveradmin
        log_info "Arquivos copiados com sucesso"
    else
        log_error "Falha ao executar comando cp"
        log_error "Verificando permissões e conteúdo:"
        ls -la dist/ubuntu-server-admin/
        ls -la /var/www/html/
        exit 1
    fi
    
    # Verificar se os arquivos foram copiados corretamente
    if [[ -f "/var/www/html/serveradmin/browser/index.html" ]] || [[ -f "/var/www/html/serveradmin/browser/main.js" ]] || [[ $(ls /var/www/html/serveradmin/browser/ | wc -l) -gt 0 ]]; then
        log "Frontend copiado e configurado com sucesso"
    else
        log_error "Falha ao copiar arquivos do frontend - nenhum arquivo encontrado no destino"
        log_error "Conteúdo do diretório de destino:"
        ls -la /var/www/html/serveradmin/browser/
        exit 1
    fi
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
        proxy_pass http://127.0.0.1:8000/;
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

    # ACME challenge (caso futuramente use certbot com HTTP-01)
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/html/serveradmin;
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
    log "Configurando certificado SSL (opcional)..."
    
    if [[ "$USE_DOMAIN" == true && -n "$DOMAIN" ]]; then
        # Tentar corrigir problemas com certbot primeiro
        log_info "Verificando e corrigindo dependências do certbot..."
        
        # Corrigir problemas conhecidos com cffi
        apt-get update
        apt-get install -y python3-cffi libffi-dev python3-dev
        
        # Reinstalar certbot se necessário
        if ! certbot --version &>/dev/null; then
            log_warning "Problemas detectados com certbot, reinstalando..."
            apt-get remove -y certbot python3-certbot-nginx
            apt-get install -y snapd
            snap install core
            snap refresh core
            snap install --classic certbot
            ln -sf /snap/bin/certbot /usr/bin/certbot
        fi
        
        # Tentar obter certificado SSL real
        log_info "Obtendo certificado SSL para $DOMAIN..."
        if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL" 2>&1; then
            # Configurar renovação automática
            systemctl enable certbot.timer 2>/dev/null || true
            systemctl start certbot.timer 2>/dev/null || true
            HTTPS_ENABLED=true
            log "Certificado SSL configurado para $DOMAIN"
        else
            log_warning "Falha ao obter certificado SSL. Continuando sem SSL..."
            log_warning "Você pode configurar SSL manualmente depois com:"
            log_warning "sudo certbot --nginx -d $DOMAIN"
        fi
    else
    log_warning "SSL não configurado: domínio não informado"
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
        
        # Verificar se o repositório está configurado para SSH
        current_url=$(git remote get-url origin)
        if [[ "$current_url" == "https://github.com/"* ]]; then
            echo "Mudando repositório para SSH..."
            git remote set-url origin git@github.com:Mundo-Do-Software/SERVERADMIN.git
        fi
        
        echo "Atualizando código..."
        git pull
        
        echo "Atualizando backend..."
        cd backend
        sudo -u serveradmin bash -c "source venv/bin/activate && pip install -r requirements.txt"
        
        echo "Atualizando frontend..."
        cd ../frontend/ubuntu-server-admin
        sudo -u serveradmin npm install
        
        # Build com retry
        echo "Compilando frontend..."
        if sudo -u serveradmin npm run build -- --configuration=production; then
            echo "✅ Build do frontend concluído"
        else
            echo "⚠️ Build otimizado falhou, tentando build básico..."
            if sudo -u serveradmin npx ng build --aot=false --optimization=false; then
                echo "✅ Build básico concluído"
            else
                echo "❌ Falha no build do frontend"
                exit 1
            fi
        fi
        
        # Verificar e copiar arquivos
        if [[ -d "dist" ]]; then
            BUILD_DIR=$(find dist/ -type d | head -2 | tail -1)  # Pegar primeiro subdiretório
            if [[ -n "$BUILD_DIR" && -f "$BUILD_DIR/index.html" ]]; then
                cp -r "$BUILD_DIR"/* /var/www/html/serveradmin/
                chown -R www-data:www-data /var/www/html/serveradmin
                echo "✅ Frontend atualizado"
            else
                echo "❌ Arquivos de build não encontrados"
                exit 1
            fi
        else
            echo "❌ Diretório dist não encontrado"
            exit 1
        fi
        
        echo "Reiniciando serviços..."
        systemctl restart ubuntu-server-admin
        systemctl reload nginx
        echo "✅ Ubuntu Server Admin atualizado com sucesso"
        ;;
    health)
        echo "=== Status dos Serviços ==="
        systemctl is-active ubuntu-server-admin && echo "✅ API: Ativo" || echo "❌ API: Inativo"
        systemctl is-active postgresql && echo "✅ PostgreSQL: Ativo" || echo "❌ PostgreSQL: Inativo"
        systemctl is-active redis-server && echo "✅ Redis: Ativo" || echo "❌ Redis: Inativo"
        systemctl is-active nginx && echo "✅ NGINX: Ativo" || echo "❌ NGINX: Inativo"
        echo ""
        echo "=== Teste de Conectividade ==="
        if curl -f -s http://localhost:8000/health >/dev/null; then
            echo "✅ API: Respondendo"
        else
            echo "❌ API: Não responde"
        fi
        if curl -f -s http://localhost >/dev/null; then
            echo "✅ Frontend: Acessível"
        else
            echo "❌ Frontend: Inacessível"
        fi
        echo ""
        echo "=== Uso de Recursos ==="
        echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
        echo "RAM: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
        echo "Disco: $(df -h / | awk 'NR==2{print $5}')"
        ;;
    test)
        echo "=== Teste de Instalação ==="
        
        # Testar Python
        if python3 --version >/dev/null 2>&1; then
            echo "✅ Python: $(python3 --version)"
        else
            echo "❌ Python: Não instalado"
        fi
        
        # Testar Node.js
        if node --version >/dev/null 2>&1; then
            echo "✅ Node.js: $(node --version)"
        else
            echo "❌ Node.js: Não instalado"
        fi
        
        # Testar serviços
        for service in ubuntu-server-admin postgresql redis-server nginx; do
            if systemctl is-active --quiet $service; then
                echo "✅ $service: Ativo"
            else
                echo "❌ $service: Inativo"
            fi
        done
        
        # Testar conectividade
        echo ""
        echo "=== Teste de URLs ==="
        if curl -f -s http://localhost >/dev/null; then
            echo "✅ http://localhost - OK"
        else
            echo "❌ http://localhost - Falha"
        fi
        
        if curl -f -s http://localhost/api/health >/dev/null; then
            echo "✅ http://localhost/api/health - OK"
        else
            echo "❌ http://localhost/api/health - Falha"
        fi
        ;;
    *)
        echo "Uso: serveradmin {start|stop|restart|status|logs|update|health|test}"
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
    if [[ "$USE_DOMAIN" == true && "$HTTPS_ENABLED" == true ]]; then
        echo "   • Frontend: https://$DOMAIN"
        echo "   • API: https://$DOMAIN/api"
        echo "   • Documentação: https://$DOMAIN/api/docs"
    elif [[ "$USE_DOMAIN" == true ]]; then
        echo "   • Frontend: http://$DOMAIN"
        echo "   • API: http://$DOMAIN/api"
        echo "   • Documentação: http://$DOMAIN/api/docs"
    fi
    # Além do domínio, exponha por IPs detectados
    [[ -n "$PUBLIC_IPV4" ]] && echo "   • IPv4 público:  http://$PUBLIC_IPV4"
    [[ -n "$PUBLIC_IPV6" ]] && echo "   • IPv6 público:  http://[$PUBLIC_IPV6]"
    # Listar primeiros locais, se existirem
    if [[ -n "$LOCAL_IPV4S" ]]; then
        echo "   • IPv4 local(is): $(echo $LOCAL_IPV4S | awk '{print $1}')"
    fi
    if [[ -n "$LOCAL_IPV6S" ]]; then
        echo "   • IPv6 local(is): $(echo $LOCAL_IPV6S | awk '{print $1}')"
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
    echo "   • Testar:      serveradmin test"
    echo ""
    
    echo -e "${CYAN}📁 Arquivos de Configuração:${NC}"
    echo "   • Backend:     $INSTALL_DIR/backend/.env"
    echo "   • NGINX:       /etc/nginx/sites-available/$NGINX_SITE"
    echo "   • Serviço:     /etc/systemd/system/ubuntu-server-admin.service"
    echo "   • Logs:        /var/log/ubuntu-server-admin-install.log"
    echo ""
    
    echo -e "${CYAN}🛡️ Configuração de Segurança:${NC}"
    if [[ "$USE_DOMAIN" == true && "$HTTPS_ENABLED" == true ]]; then
        echo "   • SSL/TLS:     ✅ Configurado via Let's Encrypt"
        echo "   • Domínio:     $DOMAIN"
        echo "   • Email SSL:   $SSL_EMAIL"
        echo "   • Renovação:   Automática (certbot.timer)"
    else
        echo "   • SSL/TLS:     ❌ Não configurado"
        echo "   • Acesso:      HTTP (porta 80)"
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
    check_system_health
    detect_ips
    
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
    
    # Correções preliminares
    fix_repository_issues
    
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
    
    # Configurar SSH se necessário (apenas em modo interativo)
    if [[ "$AUTO_INSTALL" != true ]]; then
        setup_ssh_for_git
    fi
    
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
