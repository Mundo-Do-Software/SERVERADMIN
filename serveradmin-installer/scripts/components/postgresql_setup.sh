#!/usr/bin/env bash
set -Eeuo pipefail

# =========================
# PostgreSQL Setup Script
# =========================

log_info() {
  echo -e "\e[32m[INFO] $*\e[0m"
}

log_error() {
  echo -e "\e[31m[ERROR] $*\e[0m" >&2
}

install_postgresql() {
  log_info "Iniciando a instalação do PostgreSQL..."

  apt update -y
  apt install -y postgresql postgresql-contrib

  log_info "Configurando o PostgreSQL..."

  sudo -u postgres psql <<EOF
CREATE USER serveradmin WITH PASSWORD 'secure_password';
CREATE DATABASE serveradmin OWNER serveradmin;
GRANT ALL PRIVILEGES ON DATABASE serveradmin TO serveradmin;
EOF

  log_info "PostgreSQL instalado e configurado com sucesso."
}

install_postgresql