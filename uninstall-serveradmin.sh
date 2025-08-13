#!/bin/bash
# uninstall-serveradmin.sh
# Remove Ubuntu Server Admin (backend, frontend, NGINX config, SSL, dependências)

set -e

# Parar serviços
sudo systemctl stop nginx || true
sudo systemctl stop serveradmin || true

# Remover arquivos do frontend
sudo rm -rf /var/www/html/serveradmin

# Remover backend (ajuste o caminho se necessário)
sudo rm -rf /opt/serveradmin

# Remover configuração do NGINX
sudo rm -f /etc/nginx/sites-available/serveradmin
sudo rm -f /etc/nginx/sites-enabled/serveradmin

# Remover certificados SSL
sudo rm -rf /etc/letsencrypt/live/server.mundodosoftware.com.br
sudo rm -rf /etc/letsencrypt/archive/server.mundodosoftware.com.br
sudo rm -f /etc/letsencrypt/renewal/server.mundodosoftware.com.br.conf

# Remover logs
sudo rm -f /var/log/nginx/serveradmin.*

# Reload NGINX
sudo nginx -t && sudo systemctl reload nginx

echo "Remoção concluída."
