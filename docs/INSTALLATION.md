# Guia de Instalação e Configuração

## Pré-requisitos

### Sistema Operacional
- **Servidor**: Ubuntu 18.04 LTS ou superior
- **Desenvolvimento**: Windows 10/11, Linux ou macOS

### Software Necessário
- **Python**: 3.8 ou superior
- **Node.js**: 18 ou superior
- **Angular CLI**: Última versão
- **Git**: Para controle de versão

## Instalação

### 1. Clonar o Repositório
```bash
git clone <url-do-repositorio>
cd ServerAdmin
```

### 2. Configurar Backend

#### No Ubuntu/Linux:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### No Windows:
```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Configurar Frontend
```bash
cd frontend/ubuntu-server-admin
npm install
```

### 4. Configuração de Ambiente

Copie o arquivo de exemplo:
```bash
cp backend/.env.example backend/.env
```

Edite o arquivo `.env` com suas configurações:
```env
SECRET_KEY=sua-chave-secreta-aqui
DATABASE_URL=sqlite:///./server_admin.db
BACKEND_CORS_ORIGINS=http://localhost:4200
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

## Execução

### Usando Scripts Automatizados

#### No Linux:
```bash
chmod +x dev-scripts.sh
./dev-scripts.sh
```

#### No Windows:
```powershell
.\dev-scripts.ps1
```

### Manualmente

#### Backend:
```bash
cd backend
source venv/bin/activate  # Linux
# ou
venv\Scripts\Activate.ps1  # Windows

uvicorn main:app --reload
```

#### Frontend:
```bash
cd frontend/ubuntu-server-admin
ng serve
```

## Acesso

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:8000
- **Documentação da API**: http://localhost:8000/docs

## Estrutura de Pastas

```
ServerAdmin/
├── backend/              # API Python FastAPI
│   ├── app/
│   │   ├── api/         # Rotas da API
│   │   ├── core/        # Configurações
│   │   ├── models/      # Modelos de dados
│   │   └── services/    # Lógica de negócio
│   ├── main.py          # Arquivo principal
│   └── requirements.txt # Dependências Python
├── frontend/             # Interface Angular
│   └── ubuntu-server-admin/
│       ├── src/
│       └── package.json
├── docs/                # Documentação
├── .vscode/             # Configurações VS Code
└── dev-scripts.*        # Scripts de desenvolvimento
```

## Permissões no Ubuntu

O sistema precisa de permissões sudo para algumas operações. Configure o usuário que executará a API:

```bash
# Adicionar usuário ao grupo sudo
sudo usermod -aG sudo nome-do-usuario

# Ou configurar permissões específicas no sudoers
sudo visudo
```

Adicione linhas como:
```
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl
username ALL=(ALL) NOPASSWD: /usr/bin/ufw
username ALL=(ALL) NOPASSWD: /usr/bin/apt
```

## Configuração de Produção

### 1. Usar Gunicorn para o Backend
```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### 2. Build do Frontend
```bash
cd frontend/ubuntu-server-admin
ng build --prod
```

### 3. Configurar Nginx (Opcional)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        try_files $uri $uri/ /index.html;
        root /path/to/frontend/dist;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Segurança

### 1. Firewall
O sistema pode gerenciar UFW, mas certifique-se de que as portas necessárias estejam abertas:
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 8000  # API (desenvolvimento)
sudo ufw allow 4200  # Frontend (desenvolvimento)
```

### 2. HTTPS
Para produção, configure HTTPS usando Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

### 3. Autenticação
O sistema incluirá autenticação JWT. Configure usuários administrativos apropriados.

## Monitoramento e Logs

### Logs do Sistema
- API: logs automáticos via FastAPI
- Sistema: `/var/log/syslog`
- Aplicação: configurar logging conforme necessário

### Monitoramento
O sistema fornece endpoints para monitoramento:
- `GET /health` - Status da API
- `GET /api/v1/system/info` - Informações do sistema
- `GET /api/v1/system/load` - Cargas do sistema

## Troubleshooting

### Problemas Comuns

1. **Erro de permissão**: Verificar se o usuário tem permissões sudo
2. **Porta em uso**: Verificar se as portas 8000 e 4200 estão livres
3. **Dependências**: Verificar se todas as dependências foram instaladas
4. **CORS**: Configurar adequadamente as origens permitidas

### Logs de Debug
```bash
# Backend com debug
uvicorn main:app --reload --log-level debug

# Frontend com debug
ng serve --verbose
```

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Consulte a documentação da API em `/docs`
- Verifique os logs do sistema
