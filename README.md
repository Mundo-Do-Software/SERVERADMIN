# 🖥️ Ubuntu Server Admin

Uma solução completa para administração de servidores Ubuntu com interface web moderna e APIs robustas.

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

## 🚀 Funcionalidades Implementadas

### 🔒 Segurança e Autenticação
- ✅ **JWT Authentication**: Sistema seguro de autenticação
- ✅ **UFW Firewall**: Gerenciamento completo do firewall Ubuntu
- ✅ **Fail2Ban**: Proteção contra ataques de força bruta
- ✅ **SSL/TLS**: Gerenciamento de certificados com Certbot

### 🌐 Gerenciamento de Rede  
- ✅ **Monitoramento em Tempo Real**: Status das interfaces de rede
- ✅ **Estatísticas de Tráfego**: Upload/download com dados reais via psutil
- ✅ **Teste de Conectividade**: Ferramentas de ping integradas
- ✅ **Configuração DNS**: Visualização de servidores DNS
- ✅ **Conexões Ativas**: Monitoramento de processos e portas

### 🔧 Administração de Sistema
- ✅ **Gerenciamento de Usuários**: CRUD completo de usuários do sistema
- ✅ **Controle de Serviços**: Start/stop/restart de serviços systemd
- ✅ **Monitoramento de Sistema**: CPU, RAM, disco e processos
- ✅ **Logs do Sistema**: Visualização de logs em tempo real

### 📦 Gerenciamento de Pacotes
- ✅ **APT Integration**: Instalação/remoção de pacotes
- ✅ **Pacotes Essenciais**: Stack completo (NGINX, MySQL, PHP, Node.js, Docker)
- ✅ **Atualizações**: Sistema de updates automatizado
- ✅ **Versões**: Controle de versões de pacotes

### 🌐 Servidor Web
- ✅ **NGINX Administration**: Configuração completa do NGINX
- ✅ **Virtual Hosts**: Gerenciamento de sites e domínios
- ✅ **SSL Certificates**: Criação e renovação automática via Certbot
- ✅ **Configurações**: Editor de configurações com validação

## 🛠️ Stack Tecnológica

### Backend
- **FastAPI**: Framework Python moderno e rápido
- **psutil**: Monitoramento de sistema em tempo real
- **JWT**: Autenticação segura
- **SQLAlchemy**: ORM para banco de dados
- **Redis**: Cache e sessões

### Frontend
- **Angular 18**: Framework frontend moderno
- **TypeScript**: Tipagem estática
- **SCSS**: Estilização avançada com tema claro/escuro
- **Responsive Design**: Mobile-first

### DevOps
- **Docker**: Containerização completa
- **Docker Compose**: Orquestração de serviços
- **NGINX**: Proxy reverso
- **PostgreSQL**: Banco de dados
- **Redis**: Cache e sessões

## 🚀 Quick Start

### Pré-requisitos
- Docker e Docker Compose
- Git
- 4GB RAM mínimo

### Instalação Rápida

```bash
# Clone o repositório
git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git
cd SERVERADMIN

# Inicie o ambiente de desenvolvimento
./docker-simple.ps1 dev
# ou no Linux/Mac:
# chmod +x docker-manager.sh && ./docker-manager.sh dev

# Acesse a aplicação
# Frontend: http://localhost:4200
# Backend API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Credenciais Padrão
- **Usuário**: `admin`
- **Senha**: `admin123`

## Funcionalidades

### Monitoramento do Sistema
- [ ] CPU, RAM, Disco
- [ ] Processos em execução
- [ ] Logs do sistema
- [ ] Temperatura e sensores

### Gerenciamento de Usuários
- [ ] Criar/editar/remover usuários
- [ ] Grupos e permissões
- [ ] Histórico de login

### Gerenciamento de Serviços
- [ ] Status dos serviços
- [ ] Start/stop/restart serviços
- [ ] Logs de serviços

### Network
- [ ] Configurações de rede
- [ ] Firewall (UFW)
- [ ] Portas abertas
- [ ] Conexões ativas

### Pacotes e Atualizações
- [ ] Lista de pacotes instalados
- [ ] Atualizações disponíveis
- [ ] Instalar/remover pacotes

### Backup e Segurança
- [ ] Configurar backups
- [ ] Logs de segurança
- [ ] Análise de vulnerabilidades

## Estrutura do Projeto

```
ServerAdmin/
├── backend/          # API Python FastAPI
├── frontend/         # Interface Angular
├── docs/            # Documentação
└── docker/          # Configurações Docker
```

## Como Executar

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

MIT License
