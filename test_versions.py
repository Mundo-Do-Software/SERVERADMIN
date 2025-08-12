#!/usr/bin/env python3
import subprocess
import re

def get_installed_versions(package_id):
    installed_versions = []
    
    if package_id == 'nodejs':
        result = subprocess.run(
            "bash -c 'source ~/.nvm/nvm.sh && nvm list'",
            shell=True,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("Output do nvm list:")
            print(result.stdout)
            print("---")
            for line in result.stdout.split('\n'):
                print(f"Linha: '{line.strip()}'")
                match = re.search(r'v(\d+)', line.strip())
                if match and not line.strip().startswith('lts/'):
                    major_version = match.group(1)
                    print(f"Match encontrado: {major_version}")
                    if major_version not in installed_versions and major_version.isdigit():
                        installed_versions.append(major_version)
    
    return sorted(installed_versions)

# Teste
print('Versões instaladas:', get_installed_versions('nodejs'))
