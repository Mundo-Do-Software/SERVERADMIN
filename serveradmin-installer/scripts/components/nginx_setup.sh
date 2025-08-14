#!/bin/bash

# NGINX Installation and Configuration

install_nginx() {
    log_info "Installing NGINX..."
    
    # Check if NGINX is already installed
    if is_package_installed nginx; then
        log_info "NGINX is already installed"
    else
        # Install NGINX
        apt install -y nginx || {
            log_error "Failed to install NGINX"
            exit 1
        }
    fi
    
    # Start and enable NGINX
    systemctl start nginx
    systemctl enable nginx
    
    # Check if NGINX is running
    if is_service_running nginx; then
        log_success "NGINX installed and running"
    else
        log_error "NGINX installed but not running"
        exit 1
    fi
    
    # Configure NGINX
    configure_nginx
}

configure_nginx() {
    log_info "Configuring NGINX..."
    
    local nginx_config="/etc/nginx/nginx.conf"
    # Fix: Updated template path to match actual structure
    local template_file="$(dirname "$0")/../config/templates/nginx.conf.template"
    
    # Backup original config
    cp "$nginx_config" "${nginx_config}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Use template if available, otherwise create basic config
    if [[ -f "$template_file" ]]; then
        cp "$template_file" "$nginx_config"
        log_info "Applied NGINX template configuration"
    else
        log_warn "Template not found at $template_file, creating basic configuration"
        create_basic_nginx_config
    fi
    
    # Test configuration
    if nginx -t; then
        systemctl reload nginx
        log_success "NGINX configuration applied successfully"
    else
        log_error "NGINX configuration error. Restoring backup..."
        cp "${nginx_config}.backup."* "$nginx_config" 2>/dev/null || true
        systemctl reload nginx
        exit 1
    fi
    
    # Create default server block
    create_default_server_block
    
    # Configure firewall
    configure_nginx_firewall
}

create_basic_nginx_config() {
    cat > "/etc/nginx/nginx.conf" << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF
}

create_default_server_block() {
    cat > "/etc/nginx/sites-available/default" << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    server_name _;

    location / {
        try_files $uri $uri/ =404;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
EOF

    # Enable the site
    ln -sf "/etc/nginx/sites-available/default" "/etc/nginx/sites-enabled/default"
    
    if nginx -t; then
        systemctl reload nginx
        log_success "Default server block configured"
    fi
}

configure_nginx_firewall() {
    if command -v ufw &> /dev/null; then
        ufw allow 'Nginx Full'
        log_info "Firewall configured for NGINX"
    fi
}