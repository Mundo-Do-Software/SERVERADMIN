#!/usr/bin/env bash
set -Eeuo pipefail

# =========================
# Redis Setup Script
# =========================

log_info() {
  echo -e "\e[32m[INFO] $1\e[0m"
}

log_error() {
  echo -e "\e[31m[ERROR] $1\e[0m" >&2
}

install_redis() {
  log_info "Iniciando a instalação do Redis..."
  
  if ! command -v redis-server &> /dev/null; then
    apt update -qq
    apt install -y redis-server
    log_info "Redis instalado com sucesso."
  else
    log_info "Redis já está instalado."
  fi

  log_info "Configurando Redis..."
  sed -i 's/^supervised .*/supervised systemd/' /etc/redis/redis.conf
  systemctl enable redis-server
  systemctl start redis-server
  log_info "Redis configurado e iniciado."
}

install_redis