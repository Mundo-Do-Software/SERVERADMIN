#!/bin/bash

# Verificações de sistema baseadas no quick-install.sh

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Execute como root: sudo ./install.sh"
        exit 1
    fi
}

update_system() {
    log "Atualizando sistema..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get upgrade -y -qq || true
}

check_system_health() {
    check_root
    log "Iniciando verificações do sistema..."
    update_system
    log_success "Sistema atualizado com sucesso"
}