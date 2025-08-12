#!/bin/bash

# ==============================================================================
# Ubuntu Server Admin - Script de Configuração
# ==============================================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações padrão
DEFAULT_INSTALL_DIR="/opt/ubuntu-server-admin"
DEFAULT_USER="serveradmin"
DEFAULT_DB_NAME="serveradmin"
DEFAULT_PORT="8000"

# Função para mostrar banner
show_banner() {
    echo -e "${BLUE}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "    🖥️  Ubuntu Server Admin - Configuração"
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${NC}"
}

# Função para log
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message" | tee -a /var/log/ubuntu-server-admin-config.log
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message" | tee -a /var/log/ubuntu-server-admin-config.log
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message" | tee -a /var/log/ubuntu-server-admin-config.log
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $message" | tee -a /var/log/ubuntu-server-admin-config.log
            ;;
    esac
}

# Função para verificar se é root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log "ERROR" "Este script deve ser executado como root (use sudo)"
        exit 1
    fi
}

# Função para detectar sistema operacional
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VERSION=$VERSION_ID
    else
        log "ERROR" "Não foi possível detectar o sistema operacional"
        exit 1
    fi
    
    log "INFO" "Sistema detectado: $OS $VERSION"
    
    # Verificar se é Ubuntu
    if [[ ! "$OS" =~ "Ubuntu" ]]; then
        log "WARN" "Este script foi testado apenas no Ubuntu. Prosseguir? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Função para verificar recursos do sistema
check_system_resources() {
    log "INFO" "Verificando recursos do sistema..."
    
    # Verificar RAM
    total_ram=$(free -m | awk 'NR==2{print $2}')
    if [ "$total_ram" -lt 2048 ]; then
        log "WARN" "RAM disponível: ${total_ram}MB. Recomendado: 4GB"
    else
        log "INFO" "RAM disponível: ${total_ram}MB ✓"
    fi
    
    # Verificar espaço em disco
    available_space=$(df / | awk 'NR==2{print $4}')
    if [ "$available_space" -lt 10485760 ]; then  # 10GB em KB
        log "WARN" "Espaço em disco disponível baixo"
    else
        log "INFO" "Espaço em disco suficiente ✓"
    fi
    
    # Verificar CPU
    cpu_cores=$(nproc)
    log "INFO" "Cores de CPU: $cpu_cores"
}

# Função para configurar firewall
configure_firewall() {
    log "INFO" "Configurando firewall UFW..."
    
    # Instalar e habilitar UFW se não estiver instalado
    if ! command -v ufw &> /dev/null; then
        apt update -qq
        apt install -y ufw
    fi
    
    # Configurações básicas
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # Permitir SSH
    ufw allow 22/tcp comment 'SSH'
    
    # Permitir HTTP e HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    
    # Habilitar firewall
    ufw --force enable
    
    log "INFO" "Firewall configurado com sucesso"
}

# Função para configurar repositórios
setup_repositories() {
    log "INFO" "Configurando repositórios..."
    
    # Atualizar lista de pacotes
    apt update -qq
    
    # Instalar dependências para repositórios
    apt install -y software-properties-common apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Adicionar repositório do PostgreSQL
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    
    # Adicionar repositório do Node.js
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    
    # Atualizar listas após adicionar repositórios
    apt update -qq
    
    log "INFO" "Repositórios configurados com sucesso"
}

# Função para instalar dependências base
install_base_dependencies() {
    log "INFO" "Instalando dependências base..."
    
    local packages=(
        "curl"
        "wget"
        "git"
        "htop"
        "nano"
        "vim"
        "unzip"
        "systemd"
        "systemctl"
        "build-essential"
        "python3-dev"
        "python3-pip"
        "python3-venv"
        "python3-setuptools"
        "nodejs"
        "postgresql"
        "postgresql-contrib"
        "redis-server"
        "nginx"
        "certbot"
        "python3-certbot-nginx"
        "ufw"
    )
    
    for package in "${packages[@]}"; do
        log "INFO" "Instalando $package..."
        if ! apt install -y "$package"; then
            log "ERROR" "Falha ao instalar $package"
            exit 1
        fi
    done
    
    log "INFO" "Dependências base instaladas com sucesso"
}

# Função para configurar PostgreSQL
setup_postgresql() {
    log "INFO" "Configurando PostgreSQL..."
    
    # Iniciar e habilitar PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    # Criar banco e usuário
    sudo -u postgres psql -c "CREATE DATABASE $DEFAULT_DB_NAME;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE USER $DEFAULT_USER WITH PASSWORD 'serveradmin123';" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DEFAULT_DB_NAME TO $DEFAULT_USER;" 2>/dev/null || true
    sudo -u postgres psql -c "ALTER USER $DEFAULT_USER CREATEDB;" 2>/dev/null || true
    
    log "INFO" "PostgreSQL configurado com sucesso"
}

# Função para configurar Redis
setup_redis() {
    log "INFO" "Configurando Redis..."
    
    # Iniciar e habilitar Redis
    systemctl start redis-server
    systemctl enable redis-server
    
    # Configurar Redis para bind local
    sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
    
    # Reiniciar Redis
    systemctl restart redis-server
    
    log "INFO" "Redis configurado com sucesso"
}

# Função para criar usuário do sistema
create_system_user() {
    log "INFO" "Criando usuário do sistema..."
    
    # Criar usuário se não existir
    if ! id "$DEFAULT_USER" &>/dev/null; then
        useradd -r -m -d "$DEFAULT_INSTALL_DIR" -s /bin/bash "$DEFAULT_USER"
        log "INFO" "Usuário $DEFAULT_USER criado"
    else
        log "INFO" "Usuário $DEFAULT_USER já existe"
    fi
    
    # Criar diretório se não existir
    mkdir -p "$DEFAULT_INSTALL_DIR"
    chown "$DEFAULT_USER:$DEFAULT_USER" "$DEFAULT_INSTALL_DIR"
    
    log "INFO" "Usuário do sistema configurado"
}

# Função para configurar NGINX base
setup_nginx_base() {
    log "INFO" "Configurando NGINX base..."
    
    # Remover configuração padrão
    rm -f /etc/nginx/sites-enabled/default
    
    # Iniciar e habilitar NGINX
    systemctl start nginx
    systemctl enable nginx
    
    log "INFO" "NGINX base configurado"
}

# Função para criar comando global
create_global_command() {
    log "INFO" "Criando comando global 'serveradmin'..."
    
    cat > /usr/local/bin/serveradmin << 'EOF'
#!/bin/bash

SERVICE_NAME="ubuntu-server-admin"
INSTALL_DIR="/opt/ubuntu-server-admin"

case "$1" in
    start)
        echo "Iniciando Ubuntu Server Admin..."
        systemctl start $SERVICE_NAME
        ;;
    stop)
        echo "Parando Ubuntu Server Admin..."
        systemctl stop $SERVICE_NAME
        ;;
    restart)
        echo "Reiniciando Ubuntu Server Admin..."
        systemctl restart $SERVICE_NAME
        ;;
    status)
        systemctl status $SERVICE_NAME
        ;;
    logs)
        journalctl -u $SERVICE_NAME -f
        ;;
    update)
        if [ -f "$INSTALL_DIR/update.sh" ]; then
            bash "$INSTALL_DIR/update.sh"
        else
            echo "Script de atualização não encontrado"
        fi
        ;;
    health)
        echo "Verificando saúde do sistema..."
        systemctl is-active --quiet $SERVICE_NAME && echo "✓ Serviço ativo" || echo "✗ Serviço inativo"
        systemctl is-active --quiet postgresql && echo "✓ PostgreSQL ativo" || echo "✗ PostgreSQL inativo"
        systemctl is-active --quiet redis-server && echo "✓ Redis ativo" || echo "✗ Redis inativo"
        systemctl is-active --quiet nginx && echo "✓ NGINX ativo" || echo "✗ NGINX inativo"
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status|logs|update|health}"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/serveradmin
    
    log "INFO" "Comando 'serveradmin' criado em /usr/local/bin/"
}

# Função para verificar configuração
verify_setup() {
    log "INFO" "Verificando configuração..."
    
    local services=("postgresql" "redis-server" "nginx")
    local all_ok=true
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            log "INFO" "✓ $service está ativo"
        else
            log "ERROR" "✗ $service está inativo"
            all_ok=false
        fi
    done
    
    # Verificar usuário
    if id "$DEFAULT_USER" &>/dev/null; then
        log "INFO" "✓ Usuário $DEFAULT_USER existe"
    else
        log "ERROR" "✗ Usuário $DEFAULT_USER não existe"
        all_ok=false
    fi
    
    # Verificar diretório
    if [ -d "$DEFAULT_INSTALL_DIR" ]; then
        log "INFO" "✓ Diretório $DEFAULT_INSTALL_DIR existe"
    else
        log "ERROR" "✗ Diretório $DEFAULT_INSTALL_DIR não existe"
        all_ok=false
    fi
    
    if [ "$all_ok" = true ]; then
        log "INFO" "✓ Configuração base verificada com sucesso"
        return 0
    else
        log "ERROR" "✗ Problemas encontrados na configuração"
        return 1
    fi
}

# Função principal
main() {
    show_banner
    
    # Verificações iniciais
    check_root
    detect_os
    check_system_resources
    
    log "INFO" "Iniciando configuração do ambiente..."
    
    # Configurar firewall
    configure_firewall
    
    # Configurar repositórios
    setup_repositories
    
    # Instalar dependências
    install_base_dependencies
    
    # Configurar serviços
    setup_postgresql
    setup_redis
    setup_nginx_base
    
    # Criar usuário
    create_system_user
    
    # Criar comando global
    create_global_command
    
    # Verificar configuração
    if verify_setup; then
        echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}    ✓ Configuração base concluída com sucesso!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo
        echo -e "${BLUE}Próximos passos:${NC}"
        echo "1. Execute: sudo bash install.sh"
        echo "2. Configure seu domínio"
        echo "3. Acesse a aplicação"
        echo
        echo -e "${BLUE}Comandos disponíveis após instalação:${NC}"
        echo "• serveradmin start   - Iniciar serviço"
        echo "• serveradmin stop    - Parar serviço"
        echo "• serveradmin status  - Ver status"
        echo "• serveradmin logs    - Ver logs"
        echo "• serveradmin health  - Verificar saúde"
        echo
    else
        echo -e "\n${RED}✗ Problemas encontrados na configuração${NC}"
        echo "Verifique os logs em /var/log/ubuntu-server-admin-config.log"
        exit 1
    fi
}

# Executar função principal
main "$@"
