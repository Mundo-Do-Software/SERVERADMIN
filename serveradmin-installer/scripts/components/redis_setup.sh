#!/bin/bash

# Redis Installation and Configuration

install_redis() {
    log_info "Installing Redis..."
    
    # Install Redis
    apt install -y redis-server || {
        log_error "Failed to install Redis"
        exit 1
    }
    
    # Start and enable Redis
    systemctl start redis-server
    systemctl enable redis-server
    
    if is_service_running redis-server; then
        log_success "Redis installed and running"
    else
        log_error "Redis installed but not running"
        exit 1
    fi
    
    # Configure Redis
    configure_redis
}

configure_redis() {
    log_info "Configuring Redis..."
    
    local redis_config="/etc/redis/redis.conf"
    
    # Backup original config
    cp "$redis_config" "${redis_config}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Configure Redis for production use
    sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' "$redis_config"
    sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' "$redis_config"
    
    # Set up password protection
    local redis_password=$(generate_redis_password)
    sed -i "s/^# requirepass foobared/requirepass $redis_password/" "$redis_config"
    
    # Restart Redis to apply changes
    systemctl restart redis-server
    
    # Save Redis configuration
    local config_file="$(dirname "$0")/../config/redis.conf"
    cat > "$config_file" << EOF
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$redis_password
EOF

    chmod 600 "$config_file"
    log_success "Redis configured successfully"
    log_info "Redis credentials saved to: $config_file"
}

generate_redis_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}