#!/bin/bash

# SSL Certificate Setup

setup_ssl() {
    log_info "Setting up SSL certificates..."
    
    # Install Certbot for Let's Encrypt
    apt install -y certbot python3-certbot-nginx || {
        log_error "Failed to install Certbot"
        exit 1
    }
    
    log_success "Certbot installed successfully"
    log_info "To obtain SSL certificates for your domain, run:"
    log_info "sudo certbot --nginx -d your-domain.com"
    
    # Create renewal cron job
    setup_certbot_renewal
}

setup_certbot_renewal() {
    # Add certbot renewal to crontab
    local cron_job="0 12 * * * /usr/bin/certbot renew --quiet"
    
    # Check if cron job already exists
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        log_info "Automatic SSL certificate renewal configured"
    fi
}