#!/bin/bash

# System health checks and requirements validation

check_system_health() {
    log_info "Checking system requirements..."
    
    # Check if running on Ubuntu/Debian
    if ! command -v apt &> /dev/null; then
        log_error "This installer requires a Debian/Ubuntu-based system"
        exit 1
    fi
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
    
    # Check available disk space (minimum 2GB)
    check_disk_space
    
    # Check memory (minimum 1GB)
    check_ram
    
    # Check internet connection
    check_internet_connection
    
    # Update package list
    log_info "Updating package lists..."
    apt update -qq || {
        log_error "Failed to update package lists"
        exit 1
    }
    
    log_success "System check completed successfully"
}

# Check disk space
check_disk_space() {
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local min_space=2097152  # 2GB in KB
    
    if [[ $available_space -lt $min_space ]]; then
        log_warn "Low disk space. Available: $(($available_space/1024/1024))GB. Recommended: at least 2GB free"
    else
        log_info "Disk space check passed: $(($available_space/1024/1024))GB available"
    fi
}

# Check RAM
check_ram() {
    local total_mem=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local min_mem=1048576  # 1GB in KB
    
    if [[ $total_mem -lt $min_mem ]]; then
        log_warn "Low RAM. Available: $(($total_mem/1024/1024))GB. Recommended: at least 1GB"
    else
        log_info "RAM check passed: $(($total_mem/1024/1024))GB available"
    fi
}

# Check internet connection
check_internet_connection() {
    if ping -c 1 8.8.8.8 &> /dev/null; then
        log_info "Internet connection check passed"
    else
        log_warn "No internet connection detected. Some features may not work"
    fi
}

# Check if a service is running
is_service_running() {
    local service_name=$1
    systemctl is-active --quiet "$service_name"
}

# Check if a port is available
is_port_available() {
    local port=$1
    ! ss -tuln | grep -q ":$port "
}

# Check if a package is installed
is_package_installed() {
    local package_name=$1
    dpkg -l | grep -q "^ii  $package_name "
}