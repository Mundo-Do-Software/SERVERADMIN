#!/usr/bin/env bash
set -Eeuo pipefail

# Test for the installation script
log_info() { echo -e "\033[0;32m[INFO] $*\033[0m"; }
log_error() { echo -e "\033[0;31m[ERROR] $*\033[0m"; }

test_installation() {
    log_info "Starting installation tests..."

    # Run the installation script
    if ! bash ../scripts/install.sh; then
        log_error "Installation script failed."
        return 1
    fi

    log_info "Installation script executed successfully."
    return 0
}

# Run tests
test_installation
exit $?