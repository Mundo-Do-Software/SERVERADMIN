#!/bin/bash

# Funções de logging baseadas no quick-install.sh
source "$(dirname "$0")/colors.sh"

log() { 
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() { 
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

log_warning() { 
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}