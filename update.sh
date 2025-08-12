#!/bin/bash

# ==============================================================================
# Ubuntu Server Admin - Script de Atualização
# ==============================================================================
# Este script atualiza o Ubuntu Server Admin com a versão mais recente
#
# Uso: sudo bash update.sh
# ==============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
INSTALL_DIR="/opt/ubuntu-server-admin"
SERVICE_USER="serveradmin"
BACKUP_DIR="/opt/ubuntu-server-admin-backups"

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
    
    if ! systemctl is-enabled ubuntu-server-admin &>/dev/null; then
        log_error "Serviço ubuntu-server-admin não encontrado"
        exit 1
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
    
    # Verificar se há mudanças locais
    if ! git diff-index --quiet HEAD --; then
        log_warning "Há mudanças locais não commitadas. Fazendo stash..."
        sudo -u "$SERVICE_USER" git stash
    fi
    
    # Atualizar código
    sudo -u "$SERVICE_USER" git fetch origin
    sudo -u "$SERVICE_USER" git reset --hard origin/main
    
    log "Código atualizado"
}

update_backend() {
    log "Atualizando backend..."
    
    cd "$INSTALL_DIR/backend"
    
    # Parar serviço
    systemctl stop ubuntu-server-admin
    
    # Atualizar dependências
    sudo -u "$SERVICE_USER" bash -c "source venv/bin/activate && pip install --upgrade pip"
    sudo -u "$SERVICE_USER" bash -c "source venv/bin/activate && pip install -r requirements.txt --upgrade"
    
    # Executar migrações se existirem
    if [[ -f "migrations/versions" ]]; then
        sudo -u "$SERVICE_USER" bash -c "source venv/bin/activate && alembic upgrade head"
    fi
    
    log "Backend atualizado"
}

update_frontend() {
    log "Atualizando frontend..."
    
    cd "$INSTALL_DIR/frontend/ubuntu-server-admin"
    
    # Atualizar dependências
    sudo -u "$SERVICE_USER" npm install
    sudo -u "$SERVICE_USER" npm audit fix --force || true
    
    # Build para produção
    sudo -u "$SERVICE_USER" npm run build
    
    # Atualizar arquivos do NGINX
    rm -rf /var/www/html/serveradmin/*
    cp -r dist/ubuntu-server-admin/* /var/www/html/serveradmin/
    chown -R www-data:www-data /var/www/html/serveradmin
    
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
    
    # Testar endpoint de health
    if curl -f -s http://localhost:8000/health &>/dev/null; then
        log "API está respondendo"
    else
        log_warning "API pode não estar respondendo corretamente"
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
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    CURRENT_DATE=$(git log -1 --format=%cd --date=short)
    
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
    
    # Restaurar frontend
    cp -r "$INSTALL_DIR/frontend/ubuntu-server-admin/dist/ubuntu-server-admin"/* /var/www/html/serveradmin/
    chown -R www-data:www-data /var/www/html/serveradmin
    
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
    check_installation
    
    # Verificar se há atualizações
    cd "$INSTALL_DIR"
    sudo -u "$SERVICE_USER" git fetch origin
    
    if git diff HEAD origin/main --quiet; then
        log "Sistema já está atualizado"
        exit 0
    fi
    
    log "Nova versão disponível"
    
    # Mostrar mudanças
    echo -e "${YELLOW}Mudanças na nova versão:${NC}"
    git log --oneline HEAD..origin/main | head -10
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
if [[ "$1" == "rollback" ]]; then
    check_root
    rollback
    exit 0
fi

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
