# 📋 Instalação Ubuntu Server Admin (Sem Docker)

Esta documentação descreve como instalar o Ubuntu Server Admin diretamente no Ubuntu sem usar Docker.

## 🔧 Pré-requisitos

### Sistema Operacional
- **Ubuntu 20.04+** (testado em 20.04, 22.04, 24.04)
- **2GB RAM** mínimo (4GB recomendado)
- **10GB** espaço livre em disco
- **Conexão com internet** estável

### Permissões
- Usuário com **privilégios sudo**
- Acesso SSH (se instalação remota)

### Portas Necessárias
- **80** (HTTP - redirecionamento para HTTPS)
- **443** (HTTPS - interface web)
- **22** (SSH - administração)

## 🚀 Instalação Rápida

### 1. Download e Execução

```bash
# Download do script
wget https://raw.githubusercontent.com/Mundo-Do-Software/SERVERADMIN/main/install.sh

# Dar permissão de execução
chmod +x install.sh

# Executar instalação
sudo bash install.sh
```

### 2. Configuração Durante a Instalação

O script irá solicitar:

- **Domínio**: Nome do domínio (ex: admin.meudominio.com)
- **Email SSL**: Email para certificados Let's Encrypt
- **Diretório**: Local de instalação (padrão: /opt/ubuntu-server-admin)

### 3. Aguardar Conclusão

A instalação demora aproximadamente **15-30 minutos** dependendo da velocidade da internet.

## 📦 O que é Instalado

### Dependências do Sistema
- **Python 3.11** com pip e venv
- **Node.js 20** com npm
- **PostgreSQL** (banco de dados)
- **Redis** (cache e sessões)
- **NGINX** (proxy reverso)
- **Certbot** (certificados SSL)

### Estrutura de Arquivos
```
/opt/ubuntu-server-admin/
├── backend/                 # API FastAPI
│   ├── venv/               # Ambiente virtual Python
│   ├── .env                # Configurações
│   └── main.py             # Entrada da API
├── frontend/               # Interface Angular
│   └── ubuntu-server-admin/
└── README.md

/var/www/html/serveradmin/   # Arquivos do frontend
/etc/nginx/sites-available/serveradmin  # Config NGINX
/etc/systemd/system/ubuntu-server-admin.service  # Serviço
```

### Usuário do Sistema
- **Nome**: `serveradmin`
- **Home**: `/opt/ubuntu-server-admin`
- **Shell**: `/bin/bash`
- **Privilégios**: Limitados (sem sudo)

## 🔧 Gerenciamento

### Comandos Principais

```bash
# Iniciar serviço
serveradmin start

# Parar serviço
serveradmin stop

# Reiniciar serviço
serveradmin restart

# Ver status
serveradmin status

# Ver logs em tempo real
serveradmin logs

# Atualizar sistema
serveradmin update
```

### Comandos Systemd

```bash
# Status detalhado
systemctl status ubuntu-server-admin

# Logs
journalctl -u ubuntu-server-admin -f

# Reiniciar
systemctl restart ubuntu-server-admin

# Habilitar auto-start
systemctl enable ubuntu-server-admin
```

### Configuração NGINX

```bash
# Testar configuração
nginx -t

# Recarregar configuração
systemctl reload nginx

# Ver sites ativos
ls -la /etc/nginx/sites-enabled/
```

## 🔐 Segurança

### Configurações Implementadas

- **Firewall UFW** configurado automaticamente
- **SSL/TLS** com Let's Encrypt (se domínio válido)
- **Headers de segurança** no NGINX
- **Usuário isolado** para a aplicação
- **Banco de dados local** (não exposto)

### Portas Abertas
```bash
# Verificar firewall
ufw status

# Portas típicas abertas:
# 22/tcp (SSH)
# 80/tcp (HTTP -> HTTPS redirect)
# 443/tcp (HTTPS)
```

### Certificados SSL

Para domínios válidos, o Certbot configura automaticamente:
- Certificado válido por 90 dias
- Renovação automática configurada
- Redirecionamento HTTP → HTTPS

## 🔄 Atualização

### Atualização Automática

```bash
# Executar script de atualização
sudo bash update.sh
```

### Processo de Atualização
1. **Backup automático** do código e banco
2. **Download** da versão mais recente
3. **Atualização** das dependências
4. **Rebuild** do frontend
5. **Reinicialização** dos serviços
6. **Teste** de funcionamento

### Rollback em Caso de Problemas

```bash
# Voltar para versão anterior
sudo bash update.sh rollback
```

## 🗑️ Desinstalação

### Remoção Completa

```bash
# Download do script de desinstalação
wget https://raw.githubusercontent.com/Mundo-Do-Software/SERVERADMIN/main/uninstall.sh

# Executar desinstalação
sudo bash uninstall.sh
```

### O que é Removido
- Aplicação e arquivos
- Banco de dados PostgreSQL
- Usuário do sistema
- Configurações NGINX
- Certificados SSL
- Serviço systemd

## 🔧 Configuração Avançada

### Variáveis de Ambiente

Arquivo: `/opt/ubuntu-server-admin/backend/.env`

```bash
# Banco de dados
DATABASE_URL=postgresql://user:pass@localhost/db

# Cache
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=sua_chave_secreta
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Servidor
HOST=0.0.0.0
PORT=8000
DEBUG=false

# CORS
CORS_ORIGINS=https://seudominio.com
```

### Personalização NGINX

Arquivo: `/etc/nginx/sites-available/serveradmin`

```nginx
# Adicionar configurações personalizadas
# Rate limiting, cache, etc.
```

### Backup Manual

```bash
# Backup do código
cp -r /opt/ubuntu-server-admin /backup/codigo_$(date +%Y%m%d)

# Backup do banco
sudo -u postgres pg_dump serveradmin > /backup/db_$(date +%Y%m%d).sql
```

## 🐛 Solução de Problemas

### Serviço não Inicia

```bash
# Verificar logs
journalctl -u ubuntu-server-admin -n 50

# Verificar dependências
systemctl status postgresql
systemctl status redis-server

# Testar manualmente
cd /opt/ubuntu-server-admin/backend
sudo -u serveradmin bash -c "source venv/bin/activate && python main.py"
```

### Erro de Permissões

```bash
# Corrigir permissões
chown -R serveradmin:serveradmin /opt/ubuntu-server-admin
chmod +x /opt/ubuntu-server-admin/backend/venv/bin/python
```

### NGINX Erro 502

```bash
# Verificar se API está rodando
curl http://localhost:8000

# Verificar configuração NGINX
nginx -t

# Ver logs NGINX
tail -f /var/log/nginx/serveradmin.error.log
```

### Banco de Dados

```bash
# Conectar ao banco
sudo -u postgres psql -d serveradmin

# Verificar conexões
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Resetar senha do usuário
sudo -u postgres psql -c "ALTER USER serveradmin PASSWORD 'nova_senha';"
```

### SSL/Certificados

```bash
# Verificar certificado
certbot certificates

# Renovar manualmente
certbot renew

# Testar renovação
certbot renew --dry-run
```

## 📊 Monitoramento

### Logs Importantes

```bash
# Aplicação
journalctl -u ubuntu-server-admin -f

# NGINX
tail -f /var/log/nginx/serveradmin.access.log
tail -f /var/log/nginx/serveradmin.error.log

# Sistema
tail -f /var/log/syslog

# Instalação
cat /var/log/ubuntu-server-admin-install.log
```

### Métricas do Sistema

```bash
# CPU e memória
htop

# Espaço em disco
df -h

# Conexões de rede
netstat -tulpn

# Processos da aplicação
ps aux | grep serveradmin
```

## 🔗 URLs de Acesso

### Produção
- **Frontend**: `https://seudominio.com`
- **API**: `https://seudominio.com/api`
- **Documentação**: `https://seudominio.com/api/docs`

### Desenvolvimento Local
- **Frontend**: `http://localhost`
- **API**: `http://localhost/api`

## 💡 Dicas e Boas Práticas

### Performance
- Configure cache no NGINX para assets estáticos
- Use PostgreSQL em modo otimizado para produção
- Configure log rotation para evitar enchimento de disco

### Segurança
- Altere a senha padrão imediatamente após instalação
- Configure backup regular do banco de dados
- Monitore logs regularmente
- Mantenha o sistema sempre atualizado

### Manutenção
- Execute `serveradmin update` mensalmente
- Verifique certificados SSL antes do vencimento
- Monitore uso de disco e memória
- Configure alertas de sistema

---

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/Mundo-Do-Software/SERVERADMIN/issues)
- **Documentação**: [Wiki](https://github.com/Mundo-Do-Software/SERVERADMIN/wiki)
- **Comunidade**: [Discord](https://discord.gg/mundodosoftware)
