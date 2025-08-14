#!/usr/bin/env bash
set -Eeuo pipefail

# =========================
# Configuração do NGINX
# =========================

install_nginx() {
  echo "Instalando NGINX..."
  apt update -qq
  apt install -y nginx
  systemctl enable nginx
  systemctl start nginx
  echo "NGINX instalado e iniciado."
}

configure_nginx() {
  echo "Configurando NGINX..."
  local config_file="/etc/nginx/sites-available/serveradmin"
  local template_file="../config/templates/nginx.conf.template"

  if [[ -f "$template_file" ]]; then
    cp "$template_file" "$config_file"
    ln -s "$config_file" /etc/nginx/sites-enabled/
    nginx -t
    systemctl reload nginx
    echo "NGINX configurado com sucesso."
  else
    echo "Template de configuração do NGINX não encontrado."
    exit 1
  fi
}

main() {
  install_nginx
  configure_nginx
}

main "$@"