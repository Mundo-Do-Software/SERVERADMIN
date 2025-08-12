# 🚀 Scripts de Instalação Ubuntu Server Admin

Este diretório contém todos os scripts necessários para instalar, configurar e gerenciar o Ubuntu Server Admin sem Docker.

## 📁 Estrutura dos Scripts

```
📦 Scripts de Instalação
├── 🔧 configure.sh      # Configuração inicial do ambiente
├── 📥 install.sh        # Instalação completa da aplicação
├── 🔄 update.sh         # Atualização do sistema
└── 🗑️ uninstall.sh      # Remoção completa do sistema
```

## 🎯 Ordem de Execução

### 1️⃣ Preparação do Ambiente (Opcional)
```bash
# Preparar o ambiente base (opcional - já incluído no install.sh)
sudo bash configure.sh
```

### 2️⃣ Instalação Principal
```bash
# Instalação completa
sudo bash install.sh
```

### 3️⃣ Atualização (Quando Necessário)
```bash
# Atualizar para nova versão
sudo bash update.sh
```

### 4️⃣ Desinstalação (Se Necessário)
```bash
# Remover completamente
sudo bash uninstall.sh
```

## 🔧 configure.sh

### Descrição
Script de preparação do ambiente que configura dependências básicas do sistema.

### O que faz:
- ✅ Verifica requisitos do sistema
- ✅ Configura repositórios (PostgreSQL, Node.js)
- ✅ Instala dependências base
- ✅ Configura PostgreSQL e Redis
- ✅ Configura NGINX base
- ✅ Cria usuário do sistema
- ✅ Configura firewall UFW
- ✅ Cria comando global `serveradmin`

### Uso:
```bash
# Executar como root
sudo bash configure.sh

# Verificar configuração
serveradmin health
```

### Logs:
- `/var/log/ubuntu-server-admin-config.log`

---

## 📥 install.sh

### Descrição
Script de instalação completa que baixa, configura e inicia a aplicação.

### O que faz:
- ✅ Executa configuração base (configure.sh)
- ✅ Clona repositório do GitHub
- ✅ Configura ambiente Python
- ✅ Instala dependências Python/Node.js
- ✅ Constrói frontend Angular
- ✅ Configura variáveis de ambiente
- ✅ Configura NGINX
- ✅ Configura SSL com Certbot
- ✅ Cria serviço systemd
- ✅ Inicia aplicação

### Parâmetros Interativos:
- **Domínio**: Nome do domínio (ex: admin.exemplo.com)
- **Email SSL**: Para certificados Let's Encrypt
- **Diretório**: Local de instalação (padrão: /opt/ubuntu-server-admin)

### Uso:
```bash
# Instalação interativa
sudo bash install.sh

# Instalação silenciosa (desenvolvimento)
sudo bash install.sh \
  --domain localhost \
  --email admin@localhost \
  --directory /opt/ubuntu-server-admin \
  --skip-ssl
```

### Logs:
- `/var/log/ubuntu-server-admin-install.log`

---

## 🔄 update.sh

### Descrição
Script de atualização que mantém o sistema sempre na versão mais recente.

### O que faz:
- ✅ Cria backup automático
- ✅ Para serviços temporariamente
- ✅ Baixa código atualizado
- ✅ Atualiza dependências
- ✅ Reconstrói frontend
- ✅ Executa migrações do banco
- ✅ Reinicia serviços
- ✅ Verifica funcionamento
- ✅ Rollback automático em caso de erro

### Uso:
```bash
# Atualização normal
sudo bash update.sh

# Atualização forçada (sem confirmação)
sudo bash update.sh --force

# Rollback para versão anterior
sudo bash update.sh --rollback

# Via comando global
serveradmin update
```

### Funcionalidades:
- **Backup automático** antes da atualização
- **Rollback automático** em caso de falha
- **Verificação de integridade** pós-atualização
- **Preservação de configurações** customizadas

### Logs:
- `/var/log/ubuntu-server-admin-update.log`

---

## 🗑️ uninstall.sh

### Descrição
Script de remoção completa que remove todos os componentes instalados.

### O que faz:
- ✅ Para todos os serviços
- ✅ Remove aplicação e arquivos
- ✅ Remove banco de dados
- ✅ Remove usuário do sistema
- ✅ Remove configurações NGINX
- ✅ Remove certificados SSL
- ✅ Remove serviço systemd
- ✅ Limpa logs e caches
- ⚠️ Opcionalmente remove pacotes do sistema

### Uso:
```bash
# Remoção básica (mantém pacotes do sistema)
sudo bash uninstall.sh

# Remoção completa (remove pacotes também)
sudo bash uninstall.sh --remove-packages

# Remoção silenciosa
sudo bash uninstall.sh --force
```

### O que é preservado:
- Pacotes do sistema (PostgreSQL, NGINX, etc.) - a menos que `--remove-packages`
- Outros sites/aplicações no NGINX
- Configurações globais do sistema

### Logs:
- `/var/log/ubuntu-server-admin-uninstall.log`

---

## 🎛️ Comando Global: serveradmin

Após a instalação, o comando `serveradmin` fica disponível globalmente:

```bash
# Gerenciamento de serviços
serveradmin start    # Iniciar aplicação
serveradmin stop     # Parar aplicação
serveradmin restart  # Reiniciar aplicação
serveradmin status   # Ver status detalhado

# Monitoramento
serveradmin logs     # Ver logs em tempo real
serveradmin health   # Verificar saúde do sistema

# Manutenção
serveradmin update   # Atualizar aplicação
```

## 🔐 Segurança

### Configurações Aplicadas:
- **Firewall UFW** configurado automaticamente
- **SSL/TLS** obrigatório em produção
- **Headers de segurança** configurados
- **Usuário isolado** para aplicação
- **Banco local** não exposto externamente

### Portas Configuradas:
```bash
22/tcp   # SSH
80/tcp   # HTTP (redirect → HTTPS)
443/tcp  # HTTPS
```

## 📊 Monitoramento

### Logs Principais:
```bash
# Aplicação
journalctl -u ubuntu-server-admin -f

# NGINX
tail -f /var/log/nginx/serveradmin.*.log

# Sistema
tail -f /var/log/syslog

# Scripts de instalação
tail -f /var/log/ubuntu-server-admin-*.log
```

### Verificação de Saúde:
```bash
# Status rápido
serveradmin health

# Status detalhado
systemctl status ubuntu-server-admin
systemctl status postgresql
systemctl status redis-server
systemctl status nginx
```

## 🛠️ Personalização

### Variáveis de Ambiente:
Edite `/opt/ubuntu-server-admin/backend/.env` para personalizar:

```bash
# Banco de dados
DATABASE_URL=postgresql://user:pass@localhost/db

# Cache
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=sua_chave_personalizada
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=https://seudominio.com
```

### Configuração NGINX:
Edite `/etc/nginx/sites-available/serveradmin` para:
- Rate limiting
- Cache de assets
- Headers customizados
- SSL personalizado

## 🚨 Solução de Problemas

### Problema: Serviço não inicia
```bash
# Ver logs detalhados
journalctl -u ubuntu-server-admin -n 50

# Verificar dependências
serveradmin health

# Testar manualmente
cd /opt/ubuntu-server-admin/backend
sudo -u serveradmin bash -c "source venv/bin/activate && python main.py"
```

### Problema: Erro 502 no NGINX
```bash
# Verificar se API responde
curl http://localhost:8000

# Ver logs NGINX
tail -f /var/log/nginx/serveradmin.error.log

# Testar configuração NGINX
nginx -t
```

### Problema: Banco de dados
```bash
# Verificar conexão
sudo -u postgres psql -d serveradmin -c "SELECT 1;"

# Ver conexões ativas
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

## 📋 Requisitos do Sistema

### Mínimo:
- **Ubuntu 20.04+**
- **2GB RAM**
- **10GB espaço livre**
- **Conexão internet**

### Recomendado:
- **Ubuntu 22.04 LTS**
- **4GB RAM**
- **20GB espaço livre**
- **Domínio válido** (para SSL)

## 🔄 Fluxo de Atualização

1. **Backup automático** do código e banco
2. **Download** da nova versão
3. **Parada temporária** dos serviços
4. **Atualização** das dependências
5. **Rebuild** do frontend
6. **Migração** do banco (se necessário)
7. **Reinício** dos serviços
8. **Verificação** de funcionamento
9. **Rollback** automático se houver problemas

## 📞 Suporte

- **Documentação**: [INSTALLATION.md](INSTALLATION.md)
- **Issues**: [GitHub Issues](https://github.com/Mundo-Do-Software/SERVERADMIN/issues)
- **Logs**: Sempre verifique os logs em `/var/log/ubuntu-server-admin-*.log`

---

**💡 Dica**: Execute sempre `serveradmin health` após mudanças para verificar se tudo está funcionando corretamente.
