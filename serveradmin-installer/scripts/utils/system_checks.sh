#!/usr/bin/env bash
set -Eeuo pipefail

check_disk_space() {
  local available_space
  available_space=$(df / | awk 'NR==2 {print $4}')
  local required_space=10485760 # 10GB in KB
  if [[ $available_space -lt $required_space ]]; then
    echo "ERROR: Insufficient disk space. Required: 10GB, Available: $(($available_space / 1024 / 1024))GB"
    return 1
  fi
  echo "Disk space check passed."
}

check_ram() {
  local available_ram
  available_ram=$(free -m | awk 'NR==2 {print $7}')
  local required_ram=1024
  if [[ $available_ram -lt $required_ram ]]; then
    echo "WARNING: Low available RAM: ${available_ram}MB (recommended: 2GB+)"
  fi
  echo "RAM check passed."
}

check_internet_connection() {
  if ! ping -c 1 8.8.8.8 &>/dev/null; then
    echo "ERROR: No internet connection."
    return 1
  fi
  echo "Internet connection check passed."
}

run_system_checks() {
  echo "Running system checks..."
  check_disk_space
  check_ram
  check_internet_connection
  echo "System checks completed."
}