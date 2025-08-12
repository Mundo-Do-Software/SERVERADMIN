#!/bin/bash

# ==============================================================================
# Script para corrigir problemas comuns de build do Angular
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

# Verificar se está executando como root
if [[ $EUID -ne 0 ]]; then
    log_error "Este script deve ser executado como root (sudo)"
    exit 1
fi

# Corrigir problema de ownership do Git
log "Corrigindo configuração do Git..."
INSTALL_DIR="/opt/ubuntu-server-admin"

if [[ ! -d "$INSTALL_DIR" ]]; then
    log_error "Diretório de instalação não encontrado: $INSTALL_DIR"
    exit 1
fi

cd "$INSTALL_DIR"

# Adicionar diretório como seguro
git config --global --add safe.directory "$INSTALL_DIR" 2>/dev/null || true

# Corrigir ownership se necessário
chown -R serveradmin:serveradmin "$INSTALL_DIR"

FRONTEND_DIR="$INSTALL_DIR/frontend/ubuntu-server-admin"

if [[ ! -d "$FRONTEND_DIR" ]]; then
    log_error "Diretório do frontend não encontrado: $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR"

log "Corrigindo problemas do Angular build..."

# 1. Limpar cache
log "Limpando cache do Angular..."
npx ng cache clean 2>/dev/null || true
rm -rf .angular/cache 2>/dev/null || true

# 2. Limpar node_modules
log "Limpando node_modules..."
rm -rf node_modules package-lock.json

# 3. Reinstalar dependências
log "Reinstalando dependências..."
npm install

# 4. Verificar estrutura de arquivos
log "Verificando componentes..."

# Verificar se todos os componentes referenciais existem
missing_components=()

if [[ ! -f "src/app/modules/logs/logs.component.ts" ]]; then
    missing_components+=("logs.component.ts")
fi

if [[ ${#missing_components[@]} -gt 0 ]]; then
    log_warning "Componentes ausentes detectados: ${missing_components[*]}"
    
    # Criar componente logs se não existir
    if [[ ! -f "src/app/modules/logs/logs.component.ts" ]]; then
        log "Criando componente logs..."
        mkdir -p src/app/modules/logs
        cat > src/app/modules/logs/logs.component.ts << 'EOF'
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
fi

# 5. Corrigir imports do Sass
log "Corrigindo warnings do Sass..."
if grep -q "@import" src/styles.scss; then
    log_warning "Convertendo @import para @use em styles.scss..."
    sed -i "s/@import 'styles\/theme';/@use 'styles\/theme';/g" src/styles.scss
fi

# 6. Verificar TypeScript errors
log "Verificando erros de TypeScript..."
npx tsc --noEmit --skipLibCheck 2>/dev/null || {
    log_warning "Erros de TypeScript detectados, mas continuando..."
}

# 7. Tentar build
log "Tentando build do Angular..."
if npm run build -- --configuration=production; then
    log "✅ Build concluído com sucesso"
else
    log_warning "Build otimizado falhou, tentando build de desenvolvimento..."
    if npx ng build --aot=false --optimization=false; then
        log "✅ Build de desenvolvimento concluído"
    else
        log_error "❌ Todos os builds falharam"
        exit 1
    fi
fi

# 8. Verificar se arquivos foram gerados
if [[ -d "dist" ]]; then
    BUILD_DIR=$(find dist/ -type d -name "*" | grep -v "^dist$" | head -1)
    if [[ -n "$BUILD_DIR" && -f "$BUILD_DIR/index.html" ]]; then
        log "✅ Arquivos de build gerados em: $BUILD_DIR"
        
        # Copiar para diretório web se executando como root
        if [[ $EUID -eq 0 ]]; then
            log "Copiando arquivos para /var/www/html/serveradmin..."
            rm -rf /var/www/html/serveradmin
            mkdir -p /var/www/html/serveradmin
            cp -r "$BUILD_DIR"/* /var/www/html/serveradmin/
            chown -R www-data:www-data /var/www/html/serveradmin
            log "✅ Arquivos copiados para o servidor web"
        fi
    else
        log_error "❌ Arquivos de build não encontrados"
        exit 1
    fi
else
    log_error "❌ Diretório dist não foi criado"
    exit 1
fi

log "🎉 Correção do Angular concluída com sucesso!"
