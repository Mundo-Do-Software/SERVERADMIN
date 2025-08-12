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

# 2. Configurar NGINX temporariamente (apenas HTTP)
configure_nginx_temp() {
    log "Configurando NGINX temporariamente para HTTP..."
    
    cat > /etc/nginx/sites-available/serveradmin << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html/serveradmin;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs
    access_log /var/log/nginx/serveradmin.access.log;
    error_log /var/log/nginx/serveradmin.error.log;
}
EOF
    
    # Testar configuração
    nginx -t
    systemctl reload nginx
}

# 3. Obter certificado SSL
get_ssl_certificate() {
    log "Obtendo certificado SSL..."
    
    # Usar certbot com plugin nginx
    if certbot --nginx \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --redirect \
        -d "$DOMAIN"; then
        
        log "Certificado SSL obtido e NGINX configurado automaticamente"
        
        # Configurar renovação automática
        systemctl enable certbot.timer
        systemctl start certbot.timer
        
        log "SSL configurado com sucesso!"
        
    else
        log_error "Falha ao obter certificado SSL"
        log_warning "Mantendo configuração HTTP"
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
    configure_nginx_temp
    get_ssl_certificate
    
    echo ""
    echo "✅ Configuração SSL concluída!"
    echo "🌍 Teste: https://$DOMAIN"
    echo ""
    echo "💡 No Cloudflare, configure SSL/TLS como 'Full' (não Strict)"
}

main "$@"
