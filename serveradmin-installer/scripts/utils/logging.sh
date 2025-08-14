#!/usr/bin/env bash

log_info() {
    local message="$1"
    echo -e "\033[0;32m[INFO] $(date +"%Y-%m-%d %H:%M:%S") - $message\033[0m"
}

log_warning() {
    local message="$1"
    echo -e "\033[1;33m[WARNING] $(date +"%Y-%m-%d %H:%M:%S") - $message\033[0m"
}

log_error() {
    local message="$1"
    echo -e "\033[0;31m[ERROR] $(date +"%Y-%m-%d %H:%M:%S") - $message\033[0m" >&2
}