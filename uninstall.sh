#!/bin/bash

# ==============================================================================
# Ubuntu Server Admin - Script de Desinstalação
# ==============================================================================
# Este script remove completamente o Ubuntu Server Admin do sistema
#
# Uso: sudo bash uninstall.sh
# ==============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
PROJECT_NAME="ubuntu-server-admin"
INSTALL_DIR="/opt/ubuntu-server-admin"
SERVICE_USER="serveradmin"
DB_NAME="serveradmin"
DB_USER="serveradmin"
NGINX_SITE="serveradmin"

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
        log_error "Este script deve ser executado como root ou com sudo"
        exit 1
    fi
}

confirm_uninstall() {
    echo -e "${RED}ATENÇÃO: Esta ação irá remover completamente o Ubuntu Server Admin${NC}"
    echo "Isso inclui:"
    echo "  • Aplicação e arquivos"
    echo "  • Banco de dados PostgreSQL"
    echo "  • Configurações do NGINX"
    echo "  • Usuário do sistema"
    echo "  • Certificados SSL"
    echo ""
    read -p "Tem certeza que deseja continuar? Digite 'REMOVER' para confirmar: " confirm
    
    if [[ "$confirm" != "REMOVER" ]]; then
        log "Desinstalação cancelada"
        exit 0
    fi
}

stop_services() {
    log "Parando serviços..."
    
    systemctl stop ubuntu-server-admin 2>/dev/null || true
    systemctl disable ubuntu-server-admin 2>/dev/null || true
    
    log "Serviços parados"
}

remove_systemd_service() {
    log "Removendo serviço systemd..."
    
    rm -f /etc/systemd/system/ubuntu-server-admin.service
    systemctl daemon-reload
    
    log "Serviço systemd removido"
}

remove_nginx_config() {
    log "Removendo configuração do NGINX..."
    
    rm -f /etc/nginx/sites-available/$NGINX_SITE
    rm -f /etc/nginx/sites-enabled/$NGINX_SITE
    
    # Restaurar site padrão se não existir
    if [[ ! -f /etc/nginx/sites-enabled/default ]]; then
        ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
    fi
    
    nginx -t && systemctl reload nginx
    
    log "Configuração do NGINX removida"
}

remove_ssl_certificates() {
    log "Removendo certificados SSL..."
    
    # Revogar certificados Certbot se existirem
    if command -v certbot &> /dev/null; then
        certbot delete --cert-name "$NGINX_SITE" --non-interactive 2>/dev/null || true
    fi
    
    log "Certificados SSL removidos"
}

remove_database() {
    log "Removendo banco de dados..."
    
    sudo -u postgres psql << EOF 2>/dev/null || true
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;
\q
EOF
    
    log "Banco de dados removido"
}

remove_application() {
    log "Removendo aplicação..."
    
    # Parar processos do usuário
    pkill -u "$SERVICE_USER" 2>/dev/null || true
    
    # Remover diretório da aplicação
    rm -rf "$INSTALL_DIR"
    
    # Remover arquivos do NGINX
    rm -rf /var/www/html/serveradmin
    
    log "Aplicação removida"
}

remove_user() {
    log "Removendo usuário do sistema..."
    
    if id "$SERVICE_USER" &>/dev/null; then
        userdel -r "$SERVICE_USER" 2>/dev/null || true
    fi
    
    log "Usuário removido"
}

remove_admin_script() {
    log "Removendo scripts de administração..."
    
    rm -f /usr/local/bin/serveradmin
    
    log "Scripts removidos"
}

cleanup_packages() {
    log "Limpeza opcional de pacotes..."
    
    echo "Os seguintes pacotes foram instalados e podem ser removidos se não forem usados por outros serviços:"
    echo "  • PostgreSQL"
    echo "  • Redis"
    echo "  • NGINX"
    echo "  • Node.js"
    echo "  • Certbot"
    echo ""
    read -p "Deseja remover estes pacotes? (y/N): " remove_packages
    
    if [[ "$remove_packages" =~ ^[Yy]$ ]]; then
        log "Removendo pacotes..."
        
        apt remove -y postgresql postgresql-contrib redis-server nginx nodejs certbot python3-certbot-nginx 2>/dev/null || true
        apt autoremove -y
        apt autoclean
        
        log "Pacotes removidos"
    else
        log "Pacotes mantidos no sistema"
    fi
}

show_summary() {
    echo ""
    echo -e "${GREEN}===== DESINSTALAÇÃO CONCLUÍDA =====${NC}"
    echo ""
    echo "O Ubuntu Server Admin foi removido do sistema."
    echo ""
    echo "Itens removidos:"
    echo "  ✓ Aplicação e arquivos"
    echo "  ✓ Serviço systemd"
    echo "  ✓ Configuração NGINX"
    echo "  ✓ Banco de dados"
    echo "  ✓ Usuário do sistema"
    echo "  ✓ Certificados SSL"
    echo "  ✓ Scripts de administração"
    echo ""
    
    if [[ -f /var/log/ubuntu-server-admin-install.log ]]; then
        echo "Log de instalação mantido em: /var/log/ubuntu-server-admin-install.log"
        echo ""
    fi
    
    echo -e "${GREEN}Desinstalação concluída com sucesso!${NC}"
}

main() {
    clear
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    Ubuntu Server Admin                          ║"
    echo "║                   Script de Desinstalação                       ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    check_root
    confirm_uninstall
    
    log "Iniciando desinstalação do Ubuntu Server Admin..."
    
    stop_services
    remove_systemd_service
    remove_nginx_config
    remove_ssl_certificates
    remove_database
    remove_application
    remove_user
    remove_admin_script
    cleanup_packages
    
    show_summary
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
