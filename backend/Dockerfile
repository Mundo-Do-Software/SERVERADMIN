# Dockerfile para o Backend (FastAPI)
FROM python:3.11-slim

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema e Docker CLI
RUN apt-get update && apt-get install -y \
    curl \
    procps \
    net-tools \
    pciutils \
    sudo \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    wget \
    software-properties-common \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Configurar senha para o usuário root
RUN echo 'root:serveradmin123' | chpasswd

# Criar usuário ubuntu com senha e privilégios sudo
RUN useradd -m -s /bin/bash ubuntu && \
    echo 'ubuntu:ubuntu123' | chpasswd && \
    usermod -aG sudo ubuntu

# Criar usuário admin com senha e privilégios sudo  
RUN useradd -m -s /bin/bash admin && \
    echo 'admin:admin123' | chpasswd && \
    usermod -aG sudo admin

# Copiar requirements
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Expor porta
EXPOSE 8000

# Comando para executar a aplicação
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
