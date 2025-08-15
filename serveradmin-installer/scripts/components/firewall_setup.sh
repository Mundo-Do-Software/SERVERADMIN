#!/bin/bash

# Configuração do firewall baseada no quick-install.sh

setup_firewall() {
    log "Configurando firewall..."
    ufw --force enable || true
    ufw allow ssh || true
    ufw allow 'Nginx Full' || true
    log_success "Firewall configurado"
}