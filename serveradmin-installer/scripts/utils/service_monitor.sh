#!/bin/bash

# Monitor de serviços para Server Admin
source "$(dirname "$0")/colors.sh"

check_server_admin() {
    echo ""
    print_blue "=== STATUS DO SERVER ADMIN ==="
    echo ""
    
    # Backend
    if systemctl is-active --quiet ubuntu-server-admin; then
        print_green "✓ Backend: RODANDO"
        if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
            print_green "✓ API: RESPONDENDO"
        else
            print_yellow "⚠ API: NÃO RESPONDE"
        fi
    else
        print_red "✗ Backend: PARADO"
    fi
    
    # NGINX
    if systemctl is-active --quiet nginx; then
        print_green "✓ NGINX: RODANDO"
    else
        print_red "✗ NGINX: PARADO"
    fi
    
    # PostgreSQL
    if systemctl is-active --quiet postgresql; then
        print_green "✓ PostgreSQL: RODANDO"
    else
        print_red "✗ PostgreSQL: PARADO"
    fi
    
    # Redis
    if systemctl is-active --quiet redis-server; then
        print_green "✓ Redis: RODANDO"
    else
        print_red "✗ Redis: PARADO"
    fi
    
    echo ""
}

restart_all() {
    print_blue "Reiniciando todos os serviços..."
    systemctl restart ubuntu-server-admin nginx postgresql redis-server
    sleep 3
    check_server_admin
}

show_logs() {
    print_blue "=== LOGS DO BACKEND ==="
    journalctl -u ubuntu-server-admin -n 20 --no-pager
}

case "${1:-status}" in
    "status") check_server_admin ;;
    "restart") restart_all ;;
    "logs") show_logs ;;
    *) echo "Uso: $0 [status|restart|logs]" ;;
esac