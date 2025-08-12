#!/bin/bash

# Script para corrigir configuração NGINX com Cloudflare
# Este script configura NGINX para funcionar corretamente com Cloudflare

echo "🔧 Corrigindo configuração NGINX para Cloudflare..."

# Backup da configuração atual
if [[ -f /etc/nginx/sites-available/serveradmin ]]; then
    cp /etc/nginx/sites-available/serveradmin /etc/nginx/sites-available/serveradmin.backup
    echo "✅ Backup da configuração criado"
fi

# Copiar nova configuração simplificada
cp nginx-cloudflare.conf /etc/nginx/sites-available/serveradmin

# Testar configuração
if nginx -t; then
    echo "✅ Configuração NGINX válida"
    
    # Recarregar NGINX
    systemctl reload nginx
    echo "✅ NGINX recarregado"
    
    echo ""
    echo "🎉 Configuração corrigida!"
    echo ""
    echo "📋 Configure no Cloudflare:"
    echo "1. SSL/TLS > Overview: defina como 'Flexible'"
    echo "2. SSL/TLS > Edge Certificates: ative 'Always Use HTTPS'"
    echo ""
    echo "🌍 Teste: http://server.mundodosoftware.com.br"
    
else
    echo "❌ Erro na configuração do NGINX"
    if [[ -f /etc/nginx/sites-available/serveradmin.backup ]]; then
        cp /etc/nginx/sites-available/serveradmin.backup /etc/nginx/sites-available/serveradmin
        systemctl reload nginx
        echo "✅ Configuração anterior restaurada"
    fi
fi
