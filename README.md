# Ubuntu Server Admin

Sistema de administração de servidor Ubuntu com interface web moderna.

## Arquitetura

- **Frontend**: Angular 17+ com Material Design
- **Backend**: Python FastAPI
- **Banco de Dados**: SQLite (desenvolvimento) / PostgreSQL (produção)
- **Autenticação**: JWT tokens
- **Comunicação**: RESTful APIs

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
