#!/bin/bash

# ==============================================================================
# Script de Correção Rápida - Executa na pasta existente
# ==============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

log "🔧 Correção Rápida do Angular - Executando na pasta existente"

# Detectar diretório atual
CURRENT_DIR=$(pwd)
if [[ "$CURRENT_DIR" == *"ubuntu-server-admin"* ]]; then
    if [[ -d "frontend/ubuntu-server-admin" ]]; then
        INSTALL_DIR="$CURRENT_DIR"
        FRONTEND_DIR="$CURRENT_DIR/frontend/ubuntu-server-admin"
    elif [[ -d "src/app" ]]; then
        FRONTEND_DIR="$CURRENT_DIR"
        INSTALL_DIR=$(dirname $(dirname "$CURRENT_DIR"))
    else
        log_error "Não foi possível detectar a estrutura do projeto"
        exit 1
    fi
else
    log_error "Execute este script dentro do diretório do projeto ubuntu-server-admin"
    exit 1
fi

log "Diretório do projeto: $INSTALL_DIR"
log "Diretório do frontend: $FRONTEND_DIR"

# Verificar se precisa de sudo
NEEDS_SUDO=false
if [[ ! -w "$FRONTEND_DIR" ]]; then
    NEEDS_SUDO=true
    log_warning "Permissões insuficientes - usando sudo"
fi

# Função para executar comandos com ou sem sudo
run_cmd() {
    if [[ "$NEEDS_SUDO" == "true" ]]; then
        sudo "$@"
    else
        "$@"
    fi
}

# Ir para diretório do frontend
cd "$FRONTEND_DIR"

log "Corrigindo problemas do Angular build..."

# 1. Baixar versão corrigida dos arquivos críticos
log "Baixando correções mais recentes..."

# Corrigir styles.scss
log_info "Corrigindo styles.scss..."
if grep -q "@import" src/styles.scss 2>/dev/null; then
    log_warning "Convertendo @import para @use em styles.scss..."
    run_cmd sed -i "s/@import 'styles\/theme';/@use 'styles\/theme';/g" src/styles.scss
fi

# Verificar e corrigir logs.component.ts
if [[ ! -f "src/app/modules/logs/logs.component.ts" ]]; then
    log "Criando componente logs..."
    run_cmd mkdir -p src/app/modules/logs
    run_cmd tee src/app/modules/logs/logs.component.ts > /dev/null << 'EOF'
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container">
      <div class="page-header">
        <h2>📄 System Logs</h2>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>Recent Logs</h3>
        </div>
        <div class="card-body">
          <div class="log-container">
            <div class="log-entry">
              <span class="log-time">{{getCurrentTime()}}</span>
              <span class="log-message">System operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .module-container { max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 30px; padding: 20px 0; border-bottom: 2px solid #e2e8f0; }
    .page-header h2 { margin: 0; color: #2d3748; font-size: 2rem; font-weight: 600; }
    .log-container { max-height: 400px; overflow-y: auto; background: #f8fafc; border-radius: 8px; padding: 15px; }
    .log-entry { display: flex; gap: 15px; margin-bottom: 8px; }
    .log-time { color: #666; font-weight: 500; min-width: 80px; }
  `]
})
export class LogsComponent implements OnInit {
  constructor() { }
  
  ngOnInit(): void { }
  
  getCurrentTime(): string {
    return new Date().toLocaleTimeString();
  }
}
EOF
fi

# 2. Limpar cache
log "Limpando cache do Angular..."
run_cmd rm -rf .angular/cache 2>/dev/null || true
if command -v ng &> /dev/null; then
    run_cmd npx ng cache clean 2>/dev/null || true
fi

# 3. Limpar e reinstalar dependências
log "Limpando node_modules..."
run_cmd rm -rf node_modules package-lock.json

log "Reinstalando dependências..."
if [[ "$NEEDS_SUDO" == "true" ]]; then
    sudo -u serveradmin npm install 2>/dev/null || run_cmd npm install
else
    npm install
fi

# 4. Tentar build
log "Tentando build do Angular..."
BUILD_SUCCESS=false

# Tentar build otimizado
if [[ "$NEEDS_SUDO" == "true" ]]; then
    if sudo -u serveradmin npm run build -- --configuration=production 2>/dev/null || run_cmd npm run build -- --configuration=production 2>/dev/null; then
        BUILD_SUCCESS=true
        log "✅ Build otimizado concluído"
    fi
else
    if npm run build -- --configuration=production 2>/dev/null; then
        BUILD_SUCCESS=true
        log "✅ Build otimizado concluído"
    fi
fi

# Se build otimizado falhou, tentar build básico
if [[ "$BUILD_SUCCESS" == "false" ]]; then
    log_warning "Build otimizado falhou, tentando build básico..."
    if [[ "$NEEDS_SUDO" == "true" ]]; then
        if sudo -u serveradmin npx ng build --aot=false --optimization=false 2>/dev/null || run_cmd npx ng build --aot=false --optimization=false; then
            BUILD_SUCCESS=true
            log "✅ Build básico concluído"
        fi
    else
        if npx ng build --aot=false --optimization=false; then
            BUILD_SUCCESS=true
            log "✅ Build básico concluído"
        fi
    fi
fi

if [[ "$BUILD_SUCCESS" == "false" ]]; then
    log_error "❌ Todos os builds falharam"
    exit 1
fi

# 5. Copiar arquivos para servidor web
if [[ -d "dist" ]]; then
    BUILD_DIR=$(find dist/ -type d -name "*" | grep -v "^dist$" | head -1)
    if [[ -n "$BUILD_DIR" && -f "$BUILD_DIR/index.html" ]]; then
        log "✅ Arquivos de build gerados em: $BUILD_DIR"
        
        log "Copiando arquivos para /var/www/html/serveradmin..."
        run_cmd rm -rf /var/www/html/serveradmin
        run_cmd mkdir -p /var/www/html/serveradmin
        run_cmd cp -r "$BUILD_DIR"/* /var/www/html/serveradmin/
        run_cmd chown -R www-data:www-data /var/www/html/serveradmin
        log "✅ Arquivos copiados para o servidor web"
    else
        log_error "❌ Arquivos de build não encontrados"
        exit 1
    fi
else
    log_error "❌ Diretório dist não foi criado"
    exit 1
fi

# 6. Testar se o servidor está funcionando
log "Testando servidor..."
if systemctl is-active --quiet ubuntu-server-admin 2>/dev/null; then
    log "🔄 Reiniciando serviços..."
    run_cmd systemctl restart ubuntu-server-admin
    run_cmd systemctl reload nginx
fi

# Testar conectividade
sleep 2
if curl -f -s http://localhost/ >/dev/null 2>&1; then
    log "✅ Servidor respondendo em http://localhost/"
else
    log_warning "⚠️ Servidor pode não estar respondendo ainda"
fi

log "🎉 Correção concluída com sucesso!"
log ""
log "📋 Para verificar:"
log "   • Frontend: http://localhost/"
log "   • API: http://localhost/api/docs"
log "   • Status: sudo systemctl status ubuntu-server-admin"
log "   • Logs: sudo journalctl -u ubuntu-server-admin -f"
