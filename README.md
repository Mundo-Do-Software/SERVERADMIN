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

### 📥 Instalação sem Docker (Recomendada para Produção)

#### 🔑 Repositório Privado - Instalação via SSH

Como este é um repositório privado, você precisará configurar acesso SSH:

```bash
# 1. Gerar chave SSH (se não tiver)
ssh-keygen -t ed25519 -C "seu-email@dominio.com"

# 2. Adicionar chave pública ao GitHub
cat ~/.ssh/id_ed25519.pub
# Copie e adicione em: https://github.com/settings/ssh/new

# 3. Testar conexão SSH
ssh -T git@github.com

# 4. Clonar repositório via SSH
git clone git@github.com:Mundo-Do-Software/SERVERADMIN.git
cd SERVERADMIN

# 5. Executar instalação
sudo bash install.sh
```

#### 🌐 Instalação Alternativa (HTTPS)

Se preferir usar HTTPS (solicitará credenciais):

```bash
# Clone via HTTPS
git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git
cd SERVERADMIN

# Executar instalação
sudo bash install.sh
```

#### ⚙️ Instalação Personalizada

**Para Produção com Domínio Próprio:**
```bash
sudo bash install.sh \
  --domain admin.meudominio.com \
  --email admin@meudominio.com
```

**Para Desenvolvimento Local:**
```bash
sudo bash install.sh \
  --domain localhost \
  --email admin@localhost \
  --skip-ssl
```

**Instalação Automática (Sem Prompts):**
```bash
sudo bash install.sh \
  --domain exemplo.com \
  --email admin@exemplo.com \
  --auto
```

#### 📋 Parâmetros Disponíveis

| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| `--domain` | Domínio para o servidor | `admin.exemplo.com` |
| `--email` | Email para certificados SSL | `admin@exemplo.com` |
| `--directory` | Diretório de instalação | `/opt/ubuntu-server-admin` |
| `--skip-ssl` | Pular configuração SSL | - |
| `--auto` | Instalação automática | - |
| `--help` | Mostrar ajuda | - |

### 🐳 Instalação com Docker (Desenvolvimento)

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

⚠️ **IMPORTANTE**: Altere essas credenciais após o primeiro login!

### 🛠️ Correção de Problemas de Build

Se encontrar problemas durante a instalação (ex: erros de build do Angular), use nosso script de correção:

```bash
# Ir para o diretório onde você já clonou o repositório
cd ~/temp/SERVERADMIN

# Criar script de correção
cat > quick-fix.sh << 'EOF'
#!/bin/bash
set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
log_warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
log_error() { echo -e "${RED}[ERROR] $1${NC}"; }

# Trabalhar no diretório atual (~/temp/SERVERADMIN)
FRONTEND_DIR="$(pwd)/frontend/ubuntu-server-admin"

if [[ ! -d "$FRONTEND_DIR" ]]; then
    log_error "Diretório do frontend não encontrado: $FRONTEND_DIR"
    log_error "Certifique-se de estar em ~/temp/SERVERADMIN"
    exit 1
fi

cd "$FRONTEND_DIR"
log "Corrigindo problemas do Angular em $FRONTEND_DIR..."

# 1. Corrigir styles.scss
if grep -q "@import" src/styles.scss 2>/dev/null; then
    log "Corrigindo styles.scss..."
    sed -i "s/@import 'styles\/theme';/@use 'styles\/theme';/g" src/styles.scss
fi

# 2. Verificar logs component
if [[ ! -f "src/app/modules/logs/logs.component.ts" ]]; then
    log "Criando logs component..."
    mkdir -p src/app/modules/logs
    cat > src/app/modules/logs/logs.component.ts << 'EOFC'
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="module-container">
      <div class="page-header">
        <h2>📄 System Logs</h2>
      </div>
      <div class="card">
        <div class="card-body">
          <p>System logs will be displayed here.</p>
        </div>
      </div>
    </div>
  \`,
  styles: [\`
    .module-container { max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 30px; padding: 20px 0; }
    .page-header h2 { margin: 0; color: #2d3748; }
  \`]
})
export class LogsComponent implements OnInit {
  ngOnInit(): void { }
}
EOFC
fi

# 3. Limpar e reinstalar
log "Limpando cache..."
rm -rf node_modules package-lock.json .angular/cache 2>/dev/null || true

log "Reinstalando dependências..."
npm install

# 4. Build
log "Compilando aplicação..."
if npx ng build --aot=false --optimization=false; then
    log "✅ Build concluído"
else
    log_error "Build falhou"
    exit 1
fi

# 5. Copiar arquivos para o servidor (precisa de sudo)
if [[ -d "dist" ]]; then
    BUILD_DIR=$(find dist/ -type d -maxdepth 1 | grep -v "^dist$" | head -1)
    if [[ -n "$BUILD_DIR" && -f "$BUILD_DIR/index.html" ]]; then
        log "Copiando para servidor web (requer sudo)..."
        sudo rm -rf /var/www/html/serveradmin
        sudo mkdir -p /var/www/html/serveradmin
        sudo cp -r "$BUILD_DIR"/* /var/www/html/serveradmin/
        sudo chown -R www-data:www-data /var/www/html/serveradmin
        log "✅ Arquivos copiados"
    fi
fi

# 6. Reiniciar serviços
if systemctl is-active --quiet ubuntu-server-admin 2>/dev/null; then
    log "Reiniciando serviços..."
    sudo systemctl restart ubuntu-server-admin nginx
fi

log "🎉 Correção concluída!"
log "Teste: curl http://localhost/"
EOF

# Executar correção
chmod +x quick-fix.sh
./quick-fix.sh
```

```bash
# Gerenciamento básico
serveradmin start      # Iniciar serviço
serveradmin stop       # Parar serviço
serveradmin restart    # Reiniciar serviço
serveradmin status     # Ver status

# Monitoramento
serveradmin logs       # Ver logs em tempo real
serveradmin health     # Verificar saúde do sistema

# Manutenção
serveradmin update     # Atualizar para nova versão
```

### 📚 Documentação Completa

- **[INSTALLATION.md](INSTALLATION.md)** - Guia completo de instalação sem Docker
- **[SCRIPTS.md](SCRIPTS.md)** - Documentação dos scripts de instalação
- **[QUICKSTART.md](QUICKSTART.md)** - Guia rápido com Docker

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

Este projeto está licenciado sob a licença MIT. Veja o arquivo LICENSE para detalhes.
