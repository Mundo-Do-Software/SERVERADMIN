#!/bin/bash

# Color definitions for terminal output
declare -r RED='\033[0;31m'
declare -r GREEN='\033[0;32m'
declare -r YELLOW='\033[1;33m'
declare -r BLUE='\033[0;34m'
declare -r PURPLE='\033[0;35m'
declare -r CYAN='\033[0;36m'
declare -r WHITE='\033[1;37m'
declare -r NC='\033[0m' # No Color

# Function to print colored text
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Specific color functions
print_red() { print_color "$RED" "$1"; }
print_green() { print_color "$GREEN" "$1"; }
print_yellow() { print_color "$YELLOW" "$1"; }
print_blue() { print_color "$BLUE" "$1"; }
print_purple() { print_color "$PURPLE" "$1"; }
print_cyan() { print_color "$CYAN" "$1"; }
print_white() { print_color "$WHITE" "$1"; }