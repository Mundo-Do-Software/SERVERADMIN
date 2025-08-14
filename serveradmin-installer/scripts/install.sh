#!/usr/bin/env bash
set -Eeuo pipefail

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
# Main installation function
# =========================
main() {
    log_info "Starting server admin installation..."

    # Perform system checks
    check_system_health

    # Install components
    install_nginx
    install_postgresql
    install_redis
    setup_ssl

    log_info "Server admin installation completed successfully."
}

# =========================
# Execute main function
# =========================
main "$@"