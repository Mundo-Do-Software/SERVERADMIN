#!/usr/bin/env python3
import requests
import json

# Login
login_data = {"username": "admin", "password": "admin123"}
response = requests.post("http://localhost:8000/api/v1/auth/login", json=login_data)
if response.status_code == 200:
    token = response.json()["access_token"]
    print(f"Token obtido: {token[:30]}...")
    
    # Testar endpoint de versões do Node.js
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get("http://localhost:8000/api/v1/packages-essentials/nodejs/versions", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
else:
    print(f"Erro no login: {response.status_code} - {response.text}")
