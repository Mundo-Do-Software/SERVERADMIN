# 🚀 Quick Start - ServerAdmin

## Opção 1: Docker (Recomendado) 🐳

### Pré-requisitos
- Docker Desktop instalado
- Docker Compose v2+

### Desenvolvimento
```bash
# Clonar repositório
git clone <repository-url>
cd ServerAdmin

# Iniciar ambiente de desenvolvimento
./docker-manager.sh dev
# ou no Windows:
docker-manager.bat dev
```

### Produção
```bash
# Copiar arquivo de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Iniciar ambiente de produção
./docker-manager.sh prod
# ou no Windows:
docker-manager.bat prod
```

### Comandos Úteis Docker
```bash
# Ver logs
./docker-manager.sh logs -f

# Parar serviços
./docker-manager.sh stop

# Limpar Docker
./docker-manager.sh clean

# Backup do banco
./docker-manager.sh backup

# Verificar saúde dos serviços
./docker-manager.sh health
```

## Opção 2: Scripts de Desenvolvimento 🛠️

### Configuração Inicial
```bash
# Windows PowerShell
.\dev-scripts.ps1

# Linux/Mac
chmod +x dev-scripts.sh
./dev-scripts.sh
```

### Opções do Menu
1. **Instalar dependências do Backend** - Configura ambiente Python
2. **Instalar dependências do Frontend** - Instala pacotes npm
3. **Iniciar Backend** - Executa API FastAPI
4. **Iniciar Frontend** - Executa aplicação Angular
5. **Iniciar ambos** - Executa backend e frontend simultaneamente

## Opção 3: Desenvolvimento Manual 🔧

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend/ubuntu-server-admin
npm install
ng serve
```

## 🌐 Acesso

### Desenvolvimento
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Produção (Docker)
- **Aplicação**: https://localhost
- **Nginx Stats**: Configurável

## 📁 Estrutura do Projeto

```
ServerAdmin/
├── backend/                    # FastAPI backend
│   ├── app/                   # Código da aplicação
│   ├── main.py               # Ponto de entrada
│   └── requirements.txt      # Dependências Python
├── frontend/                  # Angular frontend
│   └── ubuntu-server-admin/  # Aplicação Angular
├── docker/                   # Configurações Docker
│   ├── nginx/               # Configuração Nginx
│   ├── postgres/            # Scripts PostgreSQL
│   └── redis/               # Configuração Redis
├── backups/                  # Backups do banco
├── docker-compose.yml        # Docker Compose principal
├── docker-compose.dev.yml    # Desenvolvimento
├── docker-compose.prod.yml   # Produção
├── docker-manager.sh         # Script de gerenciamento (Linux/Mac)
├── docker-manager.bat        # Script de gerenciamento (Windows)
└── .env.example             # Template de variáveis
```

## ✨ Funcionalidades

### ✅ Implementadas
- **Dashboard do sistema** - Métricas em tempo real
- **Gerenciamento de usuários** - CRUD completo
- **Monitoramento de serviços** - Status e controle
- **Visualização de pacotes** - Instalados e atualizações
- **Informações de rede** - Interfaces e estatísticas
- **Sistema de temas** - Claro/escuro automático
- **API REST** - Documentação completa
- **Autenticação JWT** - Segurança

### 🔄 Em desenvolvimento
- **Logs do sistema** - Visualização centralizada
- **Configurações de firewall** - Interface UFW
- **Alertas e notificações** - Sistema de alertas
- **Backup automático** - Agendamento
- **Monitoramento de GPU** - Suporte NVIDIA

## 🔐 Segurança

### Permissões Necessárias
O usuário que executa a API precisa de permissões sudo para:
- Gerenciar usuários (`useradd`, `usermod`, `userdel`)
- Controlar serviços (`systemctl`)
- Configurar firewall (`ufw`)
- Gerenciar pacotes (`apt`)

### Configuração Segura
```bash
# Adicionar ao sudoers
sudo visudo

# Adicionar linhas (substitua 'username'):
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl
username ALL=(ALL) NOPASSWD: /usr/bin/ufw
username ALL=(ALL) NOPASSWD: /usr/bin/apt
username ALL=(ALL) NOPASSWD: /usr/sbin/useradd
username ALL=(ALL) NOPASSWD: /usr/sbin/usermod
username ALL=(ALL) NOPASSWD: /usr/sbin/userdel
```

## 🐛 Troubleshooting

### Docker
```bash
# Verificar logs detalhados
./docker-manager.sh logs -f

# Verificar saúde dos serviços
./docker-manager.sh health

# Reiniciar tudo
./docker-manager.sh down && ./docker-manager.sh dev
```

### Desenvolvimento Manual
1. **Porta em uso**: Verificar se as portas 8000/4200 estão livres
2. **Permissões**: Verificar se o usuário tem permissões sudo
3. **Dependências**: Executar instalação das dependências primeiro

### Debug
```bash
# Backend com logs detalhados
cd backend
source venv/bin/activate
uvicorn main:app --reload --log-level debug

# Frontend com logs
cd frontend/ubuntu-server-admin
ng serve --verbose
```

## 🚀 Deploy Produção

### 1. Preparar ambiente
```bash
# Copiar variáveis de ambiente
cp .env.example .env

# Editar com valores de produção
nano .env
```

### 2. Configurar SSL
```bash
# Gerar certificados SSL
mkdir -p docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem
```

### 3. Deploy
```bash
# Iniciar produção
./docker-manager.sh prod

# Verificar status
./docker-manager.sh health
```

## 📞 Suporte

- 📖 **Documentação completa**: `docs/INSTALLATION.md`
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussões**: GitHub Discussions
- 📧 **Email**: support@serveradmin.com

---

**Desenvolvido com ❤️ para administração de servidores Ubuntu**
