#!/bin/bash

# Script para configurar SSL com Certbot
# Para usar com Cloudflare

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="server.mundodosoftware.com.br"
EMAIL="eduardo.spada@mundodosoftware.com.br"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# 1. Corrigir problemas do certbot
fix_certbot() {
    log "Corrigindo problemas do certbot..."
    
    # Remover certbot problemático
    apt-get remove -y certbot python3-certbot-nginx 2>/dev/null || true
    
    # Instalar dependências
    apt-get update
    apt-get install -y snapd python3-cffi libffi-dev python3-dev
    
    # Instalar certbot via snap
    snap install core
    snap refresh core
    snap install --classic certbot
    
    # Criar link
    ln -sf /snap/bin/certbot /usr/bin/certbot
    
    log "Certbot reinstalado via snap"
}

# 2. Configurar NGINX para SSL
configure_nginx_ssl() {
    log "Configurando NGINX para SSL..."
    
    cat > /etc/nginx/sites-available/serveradmin << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    root /var/www/html/serveradmin;
    index index.html;

    # SSL será configurado pelo certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Frontend
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    # Security
    location ~ /\. {
        deny all;
    }

    # Logs
    access_log /var/log/nginx/serveradmin.access.log;
    error_log /var/log/nginx/serveradmin.error.log;
}
EOF
    
    # Testar configuração
    nginx -t
}

# 3. Obter certificado SSL
get_ssl_certificate() {
    log "Obtendo certificado SSL..."
    
    # Parar NGINX temporariamente para o certbot
    systemctl stop nginx
    
    # Obter certificado usando standalone
    if certbot certonly --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"; then
        
        log "Certificado SSL obtido com sucesso"
        
        # Configurar NGINX com SSL
        cat > /etc/nginx/sites-available/serveradmin << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    root /var/www/html/serveradmin;
    index index.html;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Frontend
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    # Security
    location ~ /\. {
        deny all;
    }

    # Logs
    access_log /var/log/nginx/serveradmin.access.log;
    error_log /var/log/nginx/serveradmin.error.log;
}
EOF
        
        # Testar e iniciar NGINX
        nginx -t
        systemctl start nginx
        
        # Configurar renovação automática
        systemctl enable certbot.timer
        systemctl start certbot.timer
        
        log "SSL configurado com sucesso!"
        
    else
        log_error "Falha ao obter certificado SSL"
        
        # Restaurar configuração HTTP
        cat > /etc/nginx/sites-available/serveradmin << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html/serveradmin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
        
        nginx -t
        systemctl start nginx
        log_warning "Fallback para HTTP configurado"
    fi
}

# Função principal
main() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Execute como root: sudo ./setup-ssl.sh"
        exit 1
    fi
    
    echo "🔒 Configurando SSL para $DOMAIN..."
    echo ""
    
    fix_certbot
    configure_nginx_ssl
    get_ssl_certificate
    
    echo ""
    echo "✅ Configuração SSL concluída!"
    echo "🌍 Teste: https://$DOMAIN"
    echo ""
    echo "💡 No Cloudflare, configure SSL/TLS como 'Full' (não Strict)"
}

main "$@"
