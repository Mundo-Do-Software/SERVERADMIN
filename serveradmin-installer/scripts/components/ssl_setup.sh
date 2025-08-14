#!/usr/bin/env bash
set -Eeuo pipefail

# =========================
# Configuração SSL
# =========================

log_info "Iniciando configuração SSL..."

# Verifica se o domínio foi fornecido
if [[ -z "${DOMAIN:-}" ]]; then
  echo "Erro: Nenhum domínio fornecido. A configuração SSL requer um domínio."
  exit 1
fi

# Instala Certbot
log_info "Instalando Certbot..."
apt update -qq
apt install -y certbot python3-certbot-nginx

# Configura o Certbot para o domínio
log_info "Configurando Certbot para o domínio: $DOMAIN..."
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL"; then
  log_info "Certificado SSL instalado com sucesso para $DOMAIN."
else
  echo "Erro: Falha ao obter certificado SSL. Tente novamente."
  exit 1
fi

# Habilita o timer do Certbot para renovações automáticas
systemctl enable certbot.timer
systemctl start certbot.timer

log_info "Configuração SSL concluída."