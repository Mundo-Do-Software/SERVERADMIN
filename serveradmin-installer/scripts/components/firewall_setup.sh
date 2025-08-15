#!/bin/bash

# Configuração do firewall baseada no quick-install.sh
source "$(dirname "${BASH_SOURCE[0]}")/../utils/logging.sh"

setup_firewall() {
    log "Configurando firewall..."
    ufw --force enable || true
    ufw allow ssh || true
    ufw allow 'Nginx Full' || true
    log_success "Firewall configurado"
}