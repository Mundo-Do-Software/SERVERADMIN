#!/bin/bash

# PostgreSQL Installation and Configuration

install_postgresql() {
    log_info "Installing PostgreSQL..."
    
    # Install PostgreSQL
    apt install -y postgresql postgresql-contrib || {
        log_error "Failed to install PostgreSQL"
        exit 1
    }
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    if is_service_running postgresql; then
        log_success "PostgreSQL installed and running"
    else
        log_error "PostgreSQL installed but not running"
        exit 1
    fi
    
    # Configure PostgreSQL
    configure_postgresql
}

configure_postgresql() {
    log_info "Configuring PostgreSQL..."
    
    # Create application database and user
    local db_name="serveradmin_db"
    local db_user="serveradmin"
    local db_password=$(generate_password)
    
    # Create user and database
    sudo -u postgres psql << EOF
CREATE USER $db_user WITH PASSWORD '$db_password';
CREATE DATABASE $db_name OWNER $db_user;
GRANT ALL PRIVILEGES ON DATABASE $db_name TO $db_user;
\q
EOF

    # Save credentials to config file
    local config_file="$(dirname "$0")/../config/database.conf"
    cat > "$config_file" << EOF
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$db_name
DB_USER=$db_user
DB_PASSWORD=$db_password
EOF

    chmod 600 "$config_file"
    log_success "PostgreSQL configured successfully"
    log_info "Database credentials saved to: $config_file"
}

generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}