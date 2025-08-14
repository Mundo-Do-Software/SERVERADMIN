#!/bin/bash

# Logging utilities for the installer
# Requires colors.sh to be sourced first

# Log levels
declare -r LOG_LEVEL_INFO="INFO"
declare -r LOG_LEVEL_WARN="WARN"
declare -r LOG_LEVEL_WARNING="WARN"  # Alias for compatibility
declare -r LOG_LEVEL_ERROR="ERROR"
declare -r LOG_LEVEL_SUCCESS="SUCCESS"

# Log file location
LOG_FILE="/var/log/serveradmin-install.log"

# Logging function
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create log directory if it doesn't exist
    local log_dir=$(dirname "$LOG_FILE")
    if [[ ! -d "$log_dir" ]]; then
        mkdir -p "$log_dir" 2>/dev/null || true
    fi
    
    # Log to file if possible
    if [[ -w "$log_dir" ]] 2>/dev/null; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
    
    # Print to console with colors
    case $level in
        "$LOG_LEVEL_INFO")
            print_blue "[$timestamp] [INFO] $message"
            ;;
        "$LOG_LEVEL_WARN"|"$LOG_LEVEL_WARNING")
            print_yellow "[$timestamp] [WARN] $message"
            ;;
        "$LOG_LEVEL_ERROR")
            print_red "[$timestamp] [ERROR] $message"
            ;;
        "$LOG_LEVEL_SUCCESS")
            print_green "[$timestamp] [SUCCESS] $message"
            ;;
        *)
            echo "[$timestamp] [$level] $message"
            ;;
    esac
}

# Convenience functions
log_info() { log_message "$LOG_LEVEL_INFO" "$1"; }
log_warn() { log_message "$LOG_LEVEL_WARN" "$1"; }
log_warning() { log_message "$LOG_LEVEL_WARNING" "$1"; }  # Alias for compatibility
log_error() { log_message "$LOG_LEVEL_ERROR" "$1"; }
log_success() { log_message "$LOG_LEVEL_SUCCESS" "$1"; }