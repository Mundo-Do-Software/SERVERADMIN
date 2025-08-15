#!/bin/bash

# Configuração do NGINX baseada no quick-install.sh

setup_nginx() {
    log "Configurando NGINX..."
    
    # Criar configuração do site
    cat > /etc/nginx/sites-available/serveradmin << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/html/serveradmin/browser;
    index index.html;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    # Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy para backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Logs
    access_log /var/log/nginx/serveradmin.access.log;
    error_log /var/log/nginx/serveradmin.error.log;
}
EOF

    # Ativar o site
    ln -sf /etc/nginx/sites-available/serveradmin /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    nginx -t
    
    # Iniciar/recarregar NGINX
    if ! systemctl is-active nginx &>/dev/null; then
        systemctl start nginx
        systemctl enable nginx
    else
        systemctl reload nginx
    fi
    
    log_success "NGINX configurado"
}