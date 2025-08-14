#!/bin/bash
# One-shot fix: ensure NGINX keeps /api path when proxying to backend
set -e
SITE="/etc/nginx/sites-available/serveradmin"
if [[ ! -f "$SITE" ]]; then
  echo "Site config not found: $SITE" >&2
  exit 1
fi

# Replace proxy_pass line to remove trailing slash (preserve path)
sed -i -E "s#(^[[:space:]]*proxy_pass[[:space:]]+http://127.0.0.1:8000)/;#\1#;" "$SITE"

nginx -t
systemctl reload nginx

echo "✓ NGINX proxy fixed: /api path preserved"
