#!/usr/bin/env bash

# Test functions for utility scripts

# Load utility functions
source ../scripts/utils/colors.sh
source ../scripts/utils/logging.sh
source ../scripts/utils/system_checks.sh

# Test logging functions
test_logging() {
    log_info "This is an info message"
    log_warning "This is a warning message"
    log_error "This is an error message"
}

# Test system checks
test_system_checks() {
    check_disk_space
    check_ram
    check_internet_connection
}

# Run tests
test_logging
test_system_checks

echo "All tests completed."