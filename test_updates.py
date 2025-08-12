#!/usr/bin/env python3
import sys
sys.path.append('/app')

from app.api.routes.packages_essentials import has_updates_available, ESSENTIAL_PACKAGES

# Testar a função has_updates_available para PHP
print("Testando has_updates_available para PHP:")
php_info = ESSENTIAL_PACKAGES.get("php", {})
print(f"PHP multiVersion: {php_info.get('multiVersion', False)}")

has_updates = has_updates_available("php")
print(f"PHP tem atualizações: {has_updates}")

print("\nTestando para outros pacotes:")
for pkg in ["nginx", "nodejs", "dotnet"]:
    pkg_info = ESSENTIAL_PACKAGES.get(pkg, {})
    print(f"{pkg} multiVersion: {pkg_info.get('multiVersion', False)}")
    has_updates = has_updates_available(pkg)
    print(f"{pkg} tem atualizações: {has_updates}")
