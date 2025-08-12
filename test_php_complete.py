#!/usr/bin/env python3
import sys
sys.path.append('/app')

from app.api.routes.packages_essentials import ESSENTIAL_PACKAGES, has_updates_available, check_package_installed, get_available_version

# Testar especificamente o PHP
pkg_id = "php"
pkg_info = ESSENTIAL_PACKAGES[pkg_id]

print(f"=== Teste completo para {pkg_id} ===")
print(f"multiVersion: {pkg_info.get('multiVersion', False)}")
print(f"realPackage: {pkg_info.get('realPackage', pkg_id)}")

# Verificar instalação
installed, version = check_package_installed(pkg_id)
print(f"Instalado: {installed}, Versão: {version}")

# Verificar versão disponível
available_version = get_available_version(pkg_id)
print(f"Versão disponível: {available_version}")

# Verificar atualizações
has_updates = has_updates_available(pkg_id) if installed else False
print(f"Tem atualizações: {has_updates}")

print(f"\n=== Resultado final ===")
result = {
    **pkg_info,
    "installed": installed,
    "version": version if installed else None,
    "availableVersion": available_version,
    "status": "installed" if installed else "available",
    "hasUpdates": has_updates
}

print(f"hasUpdates no resultado: {result['hasUpdates']}")
print(f"Status: {result['status']}")
print(f"Installed: {result['installed']}")
