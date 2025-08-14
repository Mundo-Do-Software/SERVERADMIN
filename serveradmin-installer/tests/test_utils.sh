#!/usr/bin/env bash

# Test functions for utility scripts

# Load utility functions
source ../scripts/utils/colors.sh
source ../scripts/utils/logging.sh
source ../scripts/utils/system_checks.sh

# Test logging functions
test_logging() {
    echo "Testing logging functions..."
    log_info "This is an info message"
    log_warning "This is a warning message"
    log_error "This is an error message"
    log_success "This is a success message"
}

# Test system checks
test_system_checks() {
    echo "Testing system check functions..."
    check_disk_space
    check_ram
    check_internet_connection
}

# Test color functions
test_colors() {
    echo "Testing color functions..."
    print_red "Red message"
    print_green "Green message"
    print_yellow "Yellow message"
    print_blue "Blue message"
    print_purple "Purple message"
    print_cyan "Cyan message"
    print_white "White message"
}

# Run tests
echo "Starting utility tests..."
test_logging
echo ""
test_system_checks
echo ""
test_colors
echo ""
echo "All tests completed."