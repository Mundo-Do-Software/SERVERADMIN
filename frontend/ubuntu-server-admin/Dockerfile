# Dockerfile para o Frontend (Angular)
FROM node:18-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte (exceto node_modules)
COPY . .

# Limpar node_modules e reinstalar para garantir compatibilidade
RUN rm -rf node_modules && npm ci

# Build da aplicação
RUN npm run build

# Estágio de produção
FROM nginx:alpine

# Copiar arquivos buildados
COPY --from=builder /app/dist/ubuntu-server-admin/browser /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Expor porta
EXPOSE 80

# Comando padrão
CMD ["nginx", "-g", "daemon off;"]
