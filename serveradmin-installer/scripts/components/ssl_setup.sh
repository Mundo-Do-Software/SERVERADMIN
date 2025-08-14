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

setup_ssl_with_domain() {
    local domain="$1"
    local email="$2"
    
    log_info "Setting up SSL certificates for domain: $domain"
    
    # Install Certbot
    apt install -y certbot python3-certbot-nginx || {
        log_error "Failed to install Certbot"
        exit 1
    }
    
    # Validate domain format
    if [[ ! "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
        log_warn "Domain format may be invalid: $domain"
    fi
    
    # Check if domain points to this server
    log_info "Checking if domain points to this server..."
    local server_ip=$(curl -s ifconfig.me || echo "")
    local domain_ip=$(dig +short "$domain" | tail -n1)
    
    if [[ "$server_ip" != "$domain_ip" ]]; then
        log_warn "Domain $domain does not point to this server ($server_ip)"
        log_warn "Current domain IP: $domain_ip"
        log_warn "Please update your DNS records and try again later"
        
        # Setup basic SSL without obtaining certificate
        setup_certbot_renewal
        return
    fi
    
    # Create NGINX server block for the domain
    create_domain_server_block "$domain"
    
    # Obtain SSL certificate
    log_info "Obtaining SSL certificate for $domain..."
    
    local certbot_cmd="certbot --nginx -d $domain --non-interactive --agree-tos"
    
    if [[ -n "$email" ]]; then
        certbot_cmd="$certbot_cmd --email $email"
    else
        certbot_cmd="$certbot_cmd --register-unsafely-without-email"
    fi
    
    if $certbot_cmd; then
        log_success "SSL certificate obtained successfully for $domain"
        log_info "Your site is now available at: https://$domain"
    else
        log_error "Failed to obtain SSL certificate for $domain"
        log_info "You can try again later with: sudo certbot --nginx -d $domain"
    fi
    
    # Setup automatic renewal
    setup_certbot_renewal
}

create_domain_server_block() {
    local domain="$1"
    local server_block="/etc/nginx/sites-available/$domain"
    
    log_info "Creating server block for $domain"
    
    cat > "$server_block" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $domain www.$domain;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    location / {
        try_files \$uri \$uri/ =404;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # API proxy (uncomment when needed)
    # location /api/ {
    #     proxy_pass http://localhost:8000;
    #     proxy_set_header Host \$host;
    #     proxy_set_header X-Real-IP \$remote_addr;
    #     proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    #     proxy_set_header X-Forwarded-Proto \$scheme;
    # }
}
EOF

    # Enable the site
    ln -sf "$server_block" "/etc/nginx/sites-enabled/$domain"
    
    # Test and reload NGINX
    if nginx -t; then
        systemctl reload nginx
        log_success "Server block for $domain created and enabled"
    else
        log_error "NGINX configuration error"
        exit 1
    fi
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