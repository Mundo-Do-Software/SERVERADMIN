#!/bin/bash

# ==============================================================================
# Ubuntu Server Admin - Script de Atualização
# ==============================================================================
# Este script atualiza o Ubuntu Server Admin com a versão mais recente
#
# Uso:
#   sudo bash update.sh          # Atualiza para última versão
#   sudo bash update.sh rollback # Restaura último backup
# ==============================================================================

set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configurações
INSTALL_DIR="/opt/ubuntu-server-admin"
# SERVICE_USER padrão; será autodetectado se inexistente
SERVICE_USER="serveradmin"
BACKUP_DIR="/opt/ubuntu-server-admin-backups"
DEFAULT_WEB_ROOT="/var/www/html/serveradmin"

# Descobrir usuário do serviço a partir do dono do diretório de instalação, se necessário
detect_service_user() {
    if id -u "$SERVICE_USER" >/dev/null 2>&1; then
        echo "$SERVICE_USER"
        return 0
    fi
    if [[ -d "$INSTALL_DIR" ]]; then
        local owner
        owner=$(stat -c %U "$INSTALL_DIR" 2>/dev/null || true)
        if [[ -n "$owner" ]] && id -u "$owner" >/dev/null 2>&1; then
            SERVICE_USER="$owner"
            echo "$SERVICE_USER"
            return 0
        fi
    fi
    # Fallback
    SERVICE_USER="root"
    echo "$SERVICE_USER"
}

# Executa comando como SERVICE_USER com shell de login para carregar ambiente (nvm, etc.)
as_service_user() {
    local cmd="$1"
    local home_dir
    home_dir=$(getent passwd "$SERVICE_USER" | cut -d: -f6 2>/dev/null || echo "/root")
    if [[ "$SERVICE_USER" == "root" ]]; then
        HOME="$home_dir" bash -lc "$cmd"
    else
        sudo -u "$SERVICE_USER" -H env HOME="$home_dir" bash -lc "$cmd"
    fi
}

# (SSH removido) Não configuramos SSH; usaremos HTTPS para operações Git

detect_web_root() {
    # Detecta o root atual do NGINX para o site serveradmin
    local site_conf=""
    local root_dir=""
    if [[ -L "/etc/nginx/sites-enabled/serveradmin" ]]; then
        site_conf=$(readlink -f /etc/nginx/sites-enabled/serveradmin)
    elif [[ -f "/etc/nginx/sites-available/serveradmin" ]]; then
        site_conf="/etc/nginx/sites-available/serveradmin"
    fi

    if [[ -n "$site_conf" && -r "$site_conf" ]]; then
        root_dir=$(grep -E "^[[:space:]]*root[[:space:]]+" "$site_conf" | head -1 | awk '{print $2}' | tr -d ';')
    fi

    if [[ -z "$root_dir" ]]; then
        echo "$DEFAULT_WEB_ROOT"
    else
        echo "$root_dir"
    fi
}

# Garante que o remoto 'origin' usa HTTPS (repositório público)
ensure_https_remote() {
    local remote_url
    remote_url=$(as_service_user "cd '$INSTALL_DIR' && git remote get-url origin" 2>/dev/null || echo "")
    if [[ -z "$remote_url" ]]; then
        as_service_user "cd '$INSTALL_DIR' && git remote add origin https://github.com/Mundo-Do-Software/SERVERADMIN.git" || true
        return
    fi
    if [[ "$remote_url" =~ ^git@github.com: ]]; then
        local https_url
        https_url=$(echo "$remote_url" | sed -E 's#git@github.com:#https://github.com/#')
        log "Convertendo remoto para HTTPS: $https_url"
        as_service_user "cd '$INSTALL_DIR' && git remote set-url origin '$https_url'"
    fi
}

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

check_installation() {
    if [[ ! -d "$INSTALL_DIR" ]]; then
        log_error "Ubuntu Server Admin não está instalado em $INSTALL_DIR"
        exit 1
    fi

    # Considera presentes unidades enabled/disabled/static
    if ! systemctl list-unit-files | grep -q "^ubuntu-server-admin\.service"; then
        # Como fallback, tenta status (retorna 3 se inativo)
        if ! systemctl status ubuntu-server-admin >/dev/null 2>&1; then
            log_error "Serviço ubuntu-server-admin não encontrado"
            exit 1
        fi
    fi
}

create_backup() {
    log "Criando backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    
    # Backup do código
    cp -r "$INSTALL_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    
    # Backup do banco de dados
    sudo -u postgres pg_dump serveradmin > "$BACKUP_DIR/${BACKUP_NAME}_database.sql"
    
    log "Backup criado em $BACKUP_DIR/$BACKUP_NAME"
}

update_code() {
    log "Atualizando código..."
    
    cd "$INSTALL_DIR"

    # Garantir que o remoto 'origin' usa HTTPS (repositório público)
    local remote_url
    remote_url=$(as_service_user "cd '$INSTALL_DIR' && git remote get-url origin" 2>/dev/null || true)
    if [[ -n "$remote_url" ]]; then
        if [[ "$remote_url" =~ ^git@github.com: ]]; then
            local https_url
            https_url=$(echo "$remote_url" | sed -E 's#git@github.com:#https://github.com/#')
            log "Convertendo remoto para HTTPS: $https_url"
            as_service_user "cd '$INSTALL_DIR' && git remote set-url origin '$https_url'"
        fi
    else
        # Se não houver remoto, configura o oficial via HTTPS
        as_service_user "cd '$INSTALL_DIR' && git remote add origin https://github.com/Mundo-Do-Software/SERVERADMIN.git" || true
    fi

    # Verificar se há mudanças locais (como o usuário do serviço)
    if ! as_service_user "cd '$INSTALL_DIR' && git diff-index --quiet HEAD --"; then
        log_warning "Há mudanças locais não commitadas. Fazendo stash..."
        as_service_user "cd '$INSTALL_DIR' && git stash --include-untracked"
    fi
    
    # Atualizar código
    as_service_user "cd '$INSTALL_DIR' && git fetch origin"
    as_service_user "cd '$INSTALL_DIR' && git reset --hard origin/main"
    
    log "Código atualizado"
}

update_backend() {
    log "Atualizando backend..."
    
    cd "$INSTALL_DIR/backend"
    
    # Parar serviço
    systemctl stop ubuntu-server-admin
    
    # Detectar/ajustar venv
    local VENV_DIR=""
    if [[ -d "venv" ]]; then
        VENV_DIR="venv"
    elif [[ -d ".venv" ]]; then
        VENV_DIR=".venv"
    else
        log_warning "Ambiente virtual não encontrado. Criando em backend/venv..."
        as_service_user "cd '$INSTALL_DIR/backend' && python3 -m venv venv"
        VENV_DIR="venv"
    fi
    
    # Atualizar dependências
    as_service_user "cd '$INSTALL_DIR/backend' && source '$VENV_DIR/bin/activate' && pip install --upgrade pip"
    as_service_user "cd '$INSTALL_DIR/backend' && source '$VENV_DIR/bin/activate' && pip install -r requirements.txt --upgrade"
    
    # Executar migrações se existirem
    if [[ -f "migrations/versions" ]]; then
        as_service_user "cd '$INSTALL_DIR/backend' && source '$VENV_DIR/bin/activate' && alembic upgrade head"
    fi
    
    log "Backend atualizado"
}

update_frontend() {
    log "Atualizando frontend..."
    
    cd "$INSTALL_DIR/frontend/ubuntu-server-admin"
    
    # Verificar disponibilidade do npm
    if ! as_service_user "command -v npm >/dev/null 2>&1"; then
        log_warning "npm não encontrado para o usuário $SERVICE_USER. Pulando rebuild do frontend."
    else
        # Atualizar dependências
        as_service_user "cd '$INSTALL_DIR/frontend/ubuntu-server-admin' && npm install"
        as_service_user "cd '$INSTALL_DIR/frontend/ubuntu-server-admin' && npm audit fix --force || true"
        
        # Build para produção
        as_service_user "cd '$INSTALL_DIR/frontend/ubuntu-server-admin' && npm run build"
    fi
    
    # Atualizar arquivos do NGINX conforme root configurado
    local web_root
    web_root=$(detect_web_root)
    if [[ "$web_root" == */browser ]]; then
        mkdir -p "$web_root"
        rm -rf "$web_root"/*
        if [[ -d "dist/ubuntu-server-admin/browser" ]]; then
            cp -r dist/ubuntu-server-admin/browser/* "$web_root/"
        else
            cp -r dist/ubuntu-server-admin/* "$web_root/"
        fi
        chown -R www-data:www-data "${web_root%/browser}"
    else
        mkdir -p "$web_root"
        rm -rf "$web_root"/*
        if [[ -d "dist/ubuntu-server-admin/browser" ]]; then
            cp -r dist/ubuntu-server-admin/browser/* "$web_root/"
        else
            cp -r dist/ubuntu-server-admin/* "$web_root/"
        fi
        chown -R www-data:www-data "$web_root"
    fi
    
    log "Frontend atualizado"
}

restart_services() {
    log "Reiniciando serviços..."
    
    systemctl start ubuntu-server-admin
    systemctl reload nginx
    
    # Verificar se os serviços estão funcionando
    sleep 5
    
    if systemctl is-active ubuntu-server-admin &>/dev/null; then
        log "Ubuntu Server Admin está rodando"
    else
        log_error "Falha ao iniciar Ubuntu Server Admin"
        exit 1
    fi
    
    if systemctl is-active nginx &>/dev/null; then
        log "NGINX está rodando"
    else
        log_error "Falha ao iniciar NGINX"
        exit 1
    fi
}

test_api() {
    log "Testando API..."
    
    # Aguardar inicialização
    sleep 10
    
    # Testar endpoint de health diretamente no backend
    if curl -f -s http://127.0.0.1:8000/health &>/dev/null; then
        log "API (backend) está respondendo em 127.0.0.1:8000"
    else
        log_warning "Backend em 127.0.0.1:8000 pode não estar respondendo"
    fi

    # Testar via NGINX (proxy) usando caminho relativo padrão
    if curl -f -s http://127.0.0.1/api/v1/health &>/dev/null; then
        log "API via NGINX está acessível em /api/v1/health"
    else
        log_warning "Proxy NGINX para /api pode não estar configurado/ativo"
    fi
}

cleanup_old_backups() {
    log "Limpando backups antigos..."
    
    # Manter apenas os últimos 5 backups
    if [[ -d "$BACKUP_DIR" ]]; then
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
    fi
    
    log "Limpeza de backups concluída"
}

show_summary() {
    echo ""
    echo -e "${GREEN}===== ATUALIZAÇÃO CONCLUÍDA =====${NC}"
    echo ""
    
    # Mostrar versão atual
    cd "$INSTALL_DIR"
    CURRENT_COMMIT=$(as_service_user "cd '$INSTALL_DIR' && git rev-parse --short HEAD")
    CURRENT_DATE=$(as_service_user "cd '$INSTALL_DIR' && git log -1 --format=%cd --date=short")
    
    echo -e "${BLUE}Versão Atual:${NC}"
    echo "  • Commit: $CURRENT_COMMIT"
    echo "  • Data: $CURRENT_DATE"
    echo ""
    
    echo -e "${BLUE}Serviços:${NC}"
    if systemctl is-active ubuntu-server-admin &>/dev/null; then
        echo "  • Ubuntu Server Admin: ✓ Ativo"
    else
        echo "  • Ubuntu Server Admin: ✗ Inativo"
    fi
    
    if systemctl is-active nginx &>/dev/null; then
        echo "  • NGINX: ✓ Ativo"
    else
        echo "  • NGINX: ✗ Inativo"
    fi
    echo ""
    
    echo -e "${BLUE}Backup:${NC}"
    echo "  • Localização: $BACKUP_DIR"
    echo ""
    
    echo -e "${GREEN}Atualização concluída com sucesso!${NC}"
    echo ""
    
    log "Para verificar logs: journalctl -u ubuntu-server-admin -f"
}

rollback() {
    log_error "Iniciando rollback..."
    
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | grep -E "^backup_" | head -1)
    
    if [[ -z "$LATEST_BACKUP" ]]; then
        log_error "Nenhum backup encontrado para rollback"
        exit 1
    fi
    
    log "Restaurando backup: $LATEST_BACKUP"
    
    # Parar serviços
    systemctl stop ubuntu-server-admin
    
    # Restaurar código
    rm -rf "$INSTALL_DIR"
    cp -r "$BACKUP_DIR/$LATEST_BACKUP" "$INSTALL_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    
    # Restaurar banco
    if [[ -f "$BACKUP_DIR/${LATEST_BACKUP}_database.sql" ]]; then
        sudo -u postgres psql -d serveradmin < "$BACKUP_DIR/${LATEST_BACKUP}_database.sql"
    fi
    
    # Restaurar frontend respeitando web root configurado
    local web_root
    web_root=$(detect_web_root)
    mkdir -p "$web_root"
    rm -rf "$web_root"/*
    if [[ -d "$INSTALL_DIR/frontend/ubuntu-server-admin/dist/ubuntu-server-admin/browser" ]]; then
        cp -r "$INSTALL_DIR/frontend/ubuntu-server-admin/dist/ubuntu-server-admin/browser"/* "$web_root/"
    else
        cp -r "$INSTALL_DIR/frontend/ubuntu-server-admin/dist/ubuntu-server-admin"/* "$web_root/"
    fi
    # Ajustar ownership
    if [[ "$web_root" == */browser ]]; then
        chown -R www-data:www-data "${web_root%/browser}"
    else
        chown -R www-data:www-data "$web_root"
    fi
    
    # Reiniciar serviços
    systemctl start ubuntu-server-admin
    systemctl reload nginx
    
    log "Rollback concluído"
}

main() {
    clear
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    Ubuntu Server Admin                          ║"
    echo "║                    Script de Atualização                        ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    check_root
    detect_service_user >/dev/null
    if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
        log_warning "Usuário de serviço '$SERVICE_USER' não existe. Usando root para operações."
    fi
    check_installation
    
    # Garantir que o remoto seja HTTPS antes de qualquer fetch
    ensure_https_remote

    # Verificar se há atualizações
    cd "$INSTALL_DIR"
    as_service_user "cd '$INSTALL_DIR' && git fetch origin"
    
    if as_service_user "cd '$INSTALL_DIR' && git diff HEAD origin/main --quiet"; then
        log "Sistema já está atualizado"
        exit 0
    fi
    
    log "Nova versão disponível"
    
    # Mostrar mudanças
    echo -e "${YELLOW}Mudanças na nova versão:${NC}"
    as_service_user "cd '$INSTALL_DIR' && git log --oneline HEAD..origin/main | head -10"
    echo ""
    
    read -p "Continuar com a atualização? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "Atualização cancelada"
        exit 0
    fi
    
    log "Iniciando atualização..."
    
    # Trap para rollback em caso de erro
    trap 'log_error "Erro durante atualização. Execute o rollback se necessário."; exit 1' ERR
    
    create_backup
    update_code
    update_backend
    update_frontend
    restart_services
    test_api
    cleanup_old_backups
    
    show_summary
}

# Verificar argumentos
ARG1="${1-}"
if [[ "$ARG1" == "rollback" ]]; then
    check_root
    detect_service_user >/dev/null
    rollback
    exit 0
fi

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
