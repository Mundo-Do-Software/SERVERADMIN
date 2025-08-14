#!/usr/bin/env bash
set -Eeuo pipefail

# =========================
# Configuration variables
# =========================
DOMAIN=""
EMAIL=""
SKIP_SSL=false
INTERACTIVE=true

# =========================
# Load utility scripts
# =========================
source "$(dirname "$0")/utils/colors.sh"
source "$(dirname "$0")/utils/logging.sh"
source "$(dirname "$0")/utils/system_checks.sh"

# =========================
# Load component scripts
# =========================
source "$(dirname "$0")/components/nginx_setup.sh"
source "$(dirname "$0")/components/postgresql_setup.sh"
source "$(dirname "$0")/components/redis_setup.sh"
source "$(dirname "$0")/components/ssl_setup.sh"

# =========================
# Help function
# =========================
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -d, --domain DOMAIN     Set domain name for SSL certificate
    -e, --email EMAIL       Set email for SSL certificate
    --skip-ssl              Skip SSL configuration
    --non-interactive       Run without user prompts
    -h, --help              Show this help message

Examples:
    $0                                    # Interactive installation
    $0 -d example.com -e admin@example.com
    $0 --skip-ssl                         # Install without SSL
    $0 --non-interactive                  # Silent installation

EOF
}

# =========================
# Parse command line arguments
# =========================
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--domain)
                DOMAIN="$2"
                shift 2
                ;;
            -e|--email)
                EMAIL="$2"
                shift 2
                ;;
            --skip-ssl)
                SKIP_SSL=true
                shift
                ;;
            --non-interactive)
                INTERACTIVE=false
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# =========================
# Interactive configuration
# =========================
interactive_config() {
    if [[ "$INTERACTIVE" == "true" ]]; then
        log_info "=== Server Admin Configuration ==="
        
        # Ask for domain
        if [[ -z "$DOMAIN" ]]; then
            echo -n "Enter your domain name (or press Enter to skip SSL): "
            read -r DOMAIN
        fi
        
        # Ask for email if domain is provided
        if [[ -n "$DOMAIN" && -z "$EMAIL" ]]; then
            echo -n "Enter your email for SSL certificate: "
            read -r EMAIL
        fi
        
        # Confirm settings
        echo ""
        log_info "Configuration Summary:"
        log_info "Domain: ${DOMAIN:-"Not configured"}"
        log_info "Email: ${EMAIL:-"Not configured"}"
        log_info "SSL: $([ -n "$DOMAIN" ] && echo "Enabled" || echo "Disabled")"
        echo ""
        
        echo -n "Continue with installation? (y/N): "
        read -r confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_info "Installation cancelled by user"
            exit 0
        fi
    fi
}

# =========================
# Main installation function
# =========================
main() {
    log_info "Starting Server Admin installation..."
    log_info "Target System: Ubuntu 24.04 Server"
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Interactive configuration
    interactive_config
    
    # Perform system checks
    check_system_health
    
    # Install components
    log_info "Installing system components..."
    install_nginx
    install_postgresql
    install_redis
    
    # Setup SSL if domain is provided
    if [[ -n "$DOMAIN" && "$SKIP_SSL" != "true" ]]; then
        setup_ssl_with_domain "$DOMAIN" "$EMAIL"
    elif [[ "$SKIP_SSL" != "true" ]]; then
        setup_ssl
    fi
    
    # Display final information
    show_completion_info
}

# =========================
# Show completion information
# =========================
show_completion_info() {
    echo ""
    log_success "======================================"
    log_success "Server Admin installation completed!"
    log_success "======================================"
    echo ""
    
    log_info "Services installed and running:"
    log_info "  ✓ NGINX Web Server"
    log_info "  ✓ PostgreSQL Database"
    log_info "  ✓ Redis Cache"
    
    if [[ -n "$DOMAIN" ]]; then
        log_info "  ✓ SSL Certificate for $DOMAIN"
        echo ""
        log_info "Your site is available at:"
        log_info "  https://$DOMAIN"
    else
        echo ""
        log_info "Your site is available at:"
        log_info "  http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP')"
    fi
    
    echo ""
    log_info "Configuration files:"
    log_info "  Database: $(dirname "$0")/../config/database.conf"
    log_info "  Redis: $(dirname "$0")/../config/redis.conf"
    log_info "  Logs: /var/log/serveradmin-install.log"
    
    echo ""
    log_info "Next steps:"
    if [[ -z "$DOMAIN" ]]; then
        log_info "  1. Configure your domain's DNS to point to this server"
        log_info "  2. Run: sudo certbot --nginx -d yourdomain.com"
    fi
    log_info "  3. Deploy your application to /var/www/html"
    log_info "  4. Configure NGINX virtual hosts as needed"
    
    echo ""
}

# =========================
# Error handler
# =========================
error_handler() {
    log_error "Installation failed at line $1"
    log_error "Check the logs at /var/log/serveradmin-install.log"
    log_error "You can re-run the installer after fixing any issues"
    exit 1
}

# Set error trap
trap 'error_handler $LINENO' ERR

# =========================
# Execute main function
# =========================
main "$@"