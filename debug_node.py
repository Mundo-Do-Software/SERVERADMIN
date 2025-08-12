#!/usr/bin/env python3
import subprocess
import re

# Testar a função de detecção com debug
result = subprocess.run(
    "bash -c 'source ~/.nvm/nvm.sh && nvm list'",
    shell=True,
    capture_output=True,
    text=True,
    timeout=10
)

print("Output do nvm list:")
print(result.stdout)
print("Return code:", result.returncode)
print("\n" + "="*50)

installed_versions = []
if result.returncode == 0:
    for line in result.stdout.split('\n'):
        line = line.strip()
        print(f"Processando linha: '{line}'")
        
        # Nova lógica: procurar apenas por linhas que começam com 'v' ou '->' seguido de 'v'
        if line.startswith('v') or (line.startswith('->') and 'v' in line):
            print(f"  -> Linha qualifica para análise: {line}")
            match = re.search(r'v(\d+)', line)
            if match:
                major_version = match.group(1)
                print(f"  -> Versão encontrada: {major_version}")
                if major_version not in installed_versions and major_version.isdigit():
                    installed_versions.append(major_version)
                    print(f"  -> Versão adicionada: {major_version}")
                else:
                    print(f"  -> Versão já existe ou inválida: {major_version}")
        else:
            print(f"  -> Linha não qualifica: {line}")

print(f"\nVersões finais: {sorted(installed_versions)}")
