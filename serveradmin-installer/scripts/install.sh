#!/usr/bin/env bash
set -Eeuo pipefail

# ==============================================================================
# Ubuntu Server Admin - Script de Instalação Modular
# Baseado no quick-install.sh funcional
# ==============================================================================

# Configurações
DOMAIN="${DOMAIN:-server.mundodosoftware.com.br}"

# Carregar módulos
source "$(dirname "$0")/utils/colors.sh"
source "$(dirname "$0")/utils/logging.sh" 
source "$(dirname "$0")/utils/system_checks.sh"
source "$(dirname "$0")/components/dependencies.sh"
source "$(dirname "$0")/components/database_setup.sh"
source "$(dirname "$0")/components/application_setup.sh"
source "$(dirname "$0")/components/nginx_setup.sh"
source "$(dirname "$0")/components/service_setup.sh"
source "$(dirname "$0")/components/firewall_setup.sh"

# Função principal
main() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Ubuntu Server Admin Setup         ║${NC}"
    echo -e "${BLUE}║          Instalação Modular             ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    # Executar instalação
    check_system_health
    install_dependencies
    setup_user
    setup_database
    setup_application
    setup_nginx
    setup_service
    setup_firewall

    # Resultado final
    echo ""
    echo -e "${GREEN}INSTALAÇÃO CONCLUÍDA${NC}"
    echo -e "${BLUE}🌍 Acesse: http://$DOMAIN${NC}"
    echo -e "${BLUE}📱 API: http://$DOMAIN/api${NC}"
    echo -e "${BLUE}📚 Docs: http://$DOMAIN/api/docs${NC}"
    echo ""
    echo -e "${YELLOW}🔐 Credenciais padrão: admin / admin123${NC}"
    echo ""
    
    # Verificação final
    log "Verificando serviços..."
    if systemctl is-active --quiet ubuntu-server-admin nginx postgresql redis-server; then
        log_success "Todos os serviços estão rodando!"
    else
        log_warning "Alguns serviços podem precisar de atenção"
    fi
}

# Executar
main "$@"