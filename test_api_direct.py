#!/usr/bin/env python3
import requests
import json

# Fazer requisição direta à API
try:
    # Login primeiro (se necessário)
    login_data = {"username": "admin", "password": "admin123"}
    login_response = requests.post("http://localhost:8000/api/v1/auth/login", json=login_data)
    
    if login_response.status_code == 200:
        token = login_response.json().get("access_token")
        print(f"Token obtido: {token[:20]}...")
        
        # Fazer requisição para a lista de pacotes
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get("http://localhost:8000/api/v1/packages-essentials?page=1&pageSize=20", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            packages = data.get("packages", [])
            
            # Encontrar PHP
            php_package = None
            for pkg in packages:
                if pkg.get("id") == "php":
                    php_package = pkg
                    break
            
            if php_package:
                print("=== Dados do PHP retornados pela API ===")
                print(f"Nome: {php_package.get('name')}")
                print(f"Instalado: {php_package.get('installed')}")
                print(f"hasUpdates: {php_package.get('hasUpdates')}")
                print(f"Versão: {php_package.get('version')}")
                print(f"Versão disponível: {php_package.get('availableVersion')}")
                print(f"multiVersion: {php_package.get('multiVersion')}")
            else:
                print("PHP não encontrado na resposta")
                
        else:
            print(f"Erro na requisição: {response.status_code} - {response.text}")
    else:
        print(f"Erro no login: {login_response.status_code} - {login_response.text}")
        
except Exception as e:
    print(f"Erro: {e}")
