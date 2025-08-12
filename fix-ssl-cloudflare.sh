#!/bin/bash

# Script para configurar SSL com Cloudflare ativo
# Usa DNS challenge em vez de HTTP challenge

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

log_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Configurar SSL usando modo manual temporário
configure_ssl_manual() {
    log "Configurando SSL com validação manual..."
    
    echo ""
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                      ATENÇÃO                                 ║${NC}"
    echo -e "${YELLOW}║                                                              ║${NC}"
    echo -e "${YELLOW}║ Para configurar SSL com Cloudflare ativo, você precisa:     ║${NC}"
    echo -e "${YELLOW}║                                                              ║${NC}"
    echo -e "${YELLOW}║ OPÇÃO 1: Pausar Cloudflare temporariamente                  ║${NC}"
    echo -e "${YELLOW}║ 1. Acesse o painel Cloudflare                               ║${NC}"
    echo -e "${YELLOW}║ 2. Vá na aba 'Overview'                                     ║${NC}"
    echo -e "${YELLOW}║ 3. Clique em 'Pause Cloudflare on Site'                    ║${NC}"
    echo -e "${YELLOW}║ 4. Execute: sudo certbot --nginx -d $DOMAIN     ║${NC}"
    echo -e "${YELLOW}║ 5. Depois reative o Cloudflare                              ║${NC}"
    echo -e "${YELLOW}║                                                              ║${NC}"
    echo -e "${YELLOW}║ OPÇÃO 2: Configurar SSL como 'Flexible' no Cloudflare      ║${NC}"
    echo -e "${YELLOW}║ 1. Cloudflare → SSL/TLS → Overview                          ║${NC}"
    echo -e "${YELLOW}║ 2. Configure como 'Flexible'                                ║${NC}"
    echo -e "${YELLOW}║ 3. Mantenha HTTP no servidor                                ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    read -p "Escolha uma opção (1 para pausar Cloudflare, 2 para Flexible): " choice
    
    case $choice in
        1)
            log_info "Aguardando você pausar o Cloudflare..."
            read -p "Pressione ENTER após pausar o Cloudflare no painel"
            
            # Tentar obter certificado
            if certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --redirect; then
                log "✅ Certificado SSL obtido com sucesso!"
                log_warning "⚠️  Agora REATIVE o Cloudflare no painel"
                log_info "💡 Configure Cloudflare SSL como 'Full' (não Strict)"
            else
                log_error "❌ Falha ao obter certificado"
            fi
            ;;
        2)
            log_info "Configurando para usar Cloudflare Flexible SSL..."
            log_warning "⚠️  Configure no Cloudflare:"
            log_warning "    SSL/TLS → Overview → 'Flexible'"
            log_warning "    SSL/TLS → Edge Certificates → 'Always Use HTTPS' ativo"
            
            # Manter configuração HTTP no servidor
            cat > /etc/nginx/sites-available/serveradmin << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html/serveradmin;
    index index.html;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

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
            
            nginx -t && systemctl reload nginx
            log "✅ Configuração HTTP mantida para Cloudflare Flexible"
            ;;
        *)
            log_error "Opção inválida"
            exit 1
            ;;
    esac
}

# Função principal
main() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Execute como root: sudo ./fix-ssl-cloudflare.sh"
        exit 1
    fi
    
    clear
    echo -e "${BLUE}🔒 Configuração SSL com Cloudflare${NC}"
    echo -e "${BLUE}═══════════════════════════════════${NC}"
    echo ""
    
    configure_ssl_manual
    
    echo ""
    echo -e "${GREEN}✅ Processo concluído!${NC}"
    echo -e "${BLUE}🌍 Teste: https://$DOMAIN${NC}"
    echo ""
}

main "$@"
