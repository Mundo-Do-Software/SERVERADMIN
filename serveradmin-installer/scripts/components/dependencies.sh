#!/bin/bash

# Instalação de dependências baseada no quick-install.sh

install_dependencies() {
    log "Instalando dependências..."
    apt-get install -y \
        python3 python3-pip python3-venv \
        postgresql postgresql-contrib \
        redis-server \
        nginx \
        git curl wget ufw

    check_nodejs
}

check_nodejs() {
    if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
        log_error "Node.js/npm ausentes. Instale:"
        log_error "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -"
        log_error "sudo apt-get install -y nodejs"
        exit 1
    else
        log "Node.js: $(node --version), npm: $(npm --version)"
    fi
}