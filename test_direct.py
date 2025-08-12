#!/usr/bin/env python3
import sys
sys.path.append('/app')

from app.api.routes.packages_essentials import get_installed_versions

# Testar a função diretamente
print("Testando get_installed_versions para nodejs:")
versions = get_installed_versions("nodejs")
print(f"Versões encontradas: {versions}")

print("\nTestando get_installed_versions para php:")
versions_php = get_installed_versions("php")
print(f"Versões PHP encontradas: {versions_php}")
