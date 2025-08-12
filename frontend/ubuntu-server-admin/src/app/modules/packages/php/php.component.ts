import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PackageService } from '../../../services/package.service';

interface PHPInfo {
  version: string;
  extensions: string[];
  settings: { [key: string]: string };
  logs: string[];
}

interface PHPVersion {
  version: string;
  installed: boolean;
  isDefault: boolean;
}

@Component({
  selector: 'app-php-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="php-admin-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <i class="fas fa-arrow-left"></i>
          Voltar para Pacotes
        </button>
        <div class="php-header">
          <div class="php-icon">🐘</div>
          <div class="header-info">
            <h1>Administração PHP</h1>
            <p>Gerencie versões, extensões e configurações do PHP</p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Carregando informações do PHP...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading" class="content-grid">
        <!-- Version Manager -->
        <div class="panel version-panel">
          <div class="panel-header">
            <h2>🔧 Gerenciar Versões</h2>
            <p>Instale e gerencie múltiplas versões do PHP</p>
          </div>
          <div class="panel-content">
            <div class="versions-grid">
              <div *ngFor="let version of phpVersions" 
                   class="version-card" 
                   [class.installed]="version.installed"
                   [class.default]="version.isDefault">
                <div class="version-header">
                  <span class="version-number">PHP {{version.version}}</span>
                  <div class="version-badges">
                    <span *ngIf="version.isDefault" class="badge default">Padrão</span>
                    <span *ngIf="version.installed" class="badge installed">Instalado</span>
                    <span *ngIf="!version.installed" class="badge available">Disponível</span>
                  </div>
                </div>
                <div class="version-actions">
                  <button *ngIf="!version.installed" 
                          class="btn install-btn" 
                          (click)="installVersion(version.version)"
                          [disabled]="actionInProgress">
                    <i class="fas fa-download"></i>
                    Instalar
                  </button>
                  
                  <button *ngIf="version.installed && !version.isDefault" 
                          class="btn default-btn" 
                          (click)="setDefaultVersion(version.version)"
                          [disabled]="actionInProgress">
                    <i class="fas fa-star"></i>
                    Definir Padrão
                  </button>
                  
                  <button *ngIf="version.installed && !version.isDefault" 
                          class="btn remove-btn" 
                          (click)="removeVersion(version.version)"
                          [disabled]="actionInProgress">
                    <i class="fas fa-trash"></i>
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PHP Info -->
        <div class="panel info-panel">
          <div class="panel-header">
            <h2>ℹ️ Informações PHP</h2>
            <button class="refresh-btn" (click)="loadPHPInfo()">
              <i class="fas fa-sync"></i>
            </button>
          </div>
          <div class="panel-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Versão Atual:</span>
                <span class="info-value">{{phpInfo?.version || 'N/A'}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Extensões Carregadas:</span>
                <span class="info-value">{{phpInfo?.extensions?.length || 0}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Memory Limit:</span>
                <span class="info-value">{{phpInfo?.settings?.['memory_limit'] || 'N/A'}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Max Execution Time:</span>
                <span class="info-value">{{phpInfo?.settings?.['max_execution_time'] || 'N/A'}}s</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Extensions -->
        <div class="panel extensions-panel">
          <div class="panel-header">
            <h2>🧩 Extensões PHP</h2>
            <p>Extensões PHP instaladas e disponíveis</p>
          </div>
          <div class="panel-content">
            <div class="extensions-filter">
              <input type="text" 
                     placeholder="Buscar extensões..." 
                     [(ngModel)]="extensionFilter"
                     class="filter-input">
            </div>
            <div class="extensions-grid">
              <div *ngFor="let extension of getFilteredExtensions()" class="extension-item">
                <span class="extension-name">{{extension}}</span>
                <span class="extension-status">✅ Instalada</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="panel actions-panel">
          <div class="panel-header">
            <h2>⚡ Ações Rápidas</h2>
          </div>
          <div class="panel-content">
            <div class="actions-grid">
              <button class="action-card" (click)="viewPHPInfo()">
                <i class="fas fa-info-circle"></i>
                <span>Ver phpinfo()</span>
              </button>
              
              <button class="action-card" (click)="editPHPIni()">
                <i class="fas fa-edit"></i>
                <span>Editar php.ini</span>
              </button>
              
              <button class="action-card" (click)="restartPHPFPM()">
                <i class="fas fa-redo"></i>
                <span>Reiniciar PHP-FPM</span>
              </button>
              
              <button class="action-card" (click)="viewLogs()">
                <i class="fas fa-file-alt"></i>
                <span>Ver Logs</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div *ngIf="message" class="message" [class]="message.type">
        <i [class]="getMessageIcon()"></i>
        <span>{{message.text}}</span>
        <button class="close-btn" (click)="clearMessage()">×</button>
      </div>
    </div>
  `,
  styleUrls: ['./php.component.scss']
})
export class PhpComponent implements OnInit {
  loading = true;
  actionInProgress = false;
  extensionFilter = '';
  
  phpInfo: PHPInfo | null = null;
  phpVersions: PHPVersion[] = [
    { version: '8.1', installed: true, isDefault: true },
    { version: '8.2', installed: true, isDefault: false },
    { version: '8.3', installed: true, isDefault: false },
    { version: '8.4', installed: false, isDefault: false }
  ];

  message: { type: 'success' | 'error' | 'info'; text: string } | null = null;

  constructor(
    private router: Router,
    private packageService: PackageService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      await this.loadPHPVersions();
      await this.loadPHPInfo();
    } catch (error) {
      console.error('Erro ao carregar dados do PHP:', error);
      this.showMessage('error', 'Erro ao carregar informações do PHP');
    } finally {
      this.loading = false;
    }
  }

  async loadPHPVersions() {
    try {
      const response = await this.packageService.getPackageVersions('php').toPromise();
      if (response) {
        this.phpVersions = response.availableVersions.map(version => ({
          version,
          installed: response.installedVersions.includes(version),
          isDefault: response.defaultVersion === version
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar versões do PHP:', error);
    }
  }

  async loadPHPInfo() {
    // Simulando dados do PHP info - integrar com API real
    this.phpInfo = {
      version: '8.1.2',
      extensions: [
        'Core', 'date', 'libxml', 'openssl', 'pcre', 'zlib', 'filter', 'hash',
        'json', 'pcntl', 'readline', 'Reflection', 'SPL', 'session', 'standard',
        'sodium', 'mysqlnd', 'PDO', 'xml', 'calendar', 'ctype', 'curl', 'dom',
        'mbstring', 'fileinfo', 'ftp', 'gd', 'gettext', 'iconv', 'intl',
        'mysqli', 'pdo_mysql', 'pdo_sqlite', 'Phar', 'posix', 'sqlite3',
        'tokenizer', 'xmlreader', 'xmlwriter', 'zip', 'redis', 'imagick'
      ],
      settings: {
        'memory_limit': '256M',
        'max_execution_time': '30',
        'upload_max_filesize': '64M',
        'post_max_size': '64M'
      },
      logs: []
    };
  }

  async installVersion(version: string) {
    this.actionInProgress = true;
    try {
      const response = await this.packageService.installPackageVersion('php', version).toPromise();
      if (response?.success) {
        this.showMessage('success', `PHP ${version} instalado com sucesso!`);
        await this.loadPHPVersions();
      } else {
        this.showMessage('error', response?.message || 'Erro ao instalar versão');
      }
    } catch (error) {
      this.showMessage('error', 'Erro ao instalar versão do PHP');
    } finally {
      this.actionInProgress = false;
    }
  }

  async setDefaultVersion(version: string) {
    this.actionInProgress = true;
    try {
      const response = await this.packageService.setDefaultPackageVersion('php', version).toPromise();
      if (response?.success) {
        this.showMessage('success', `PHP ${version} definido como padrão!`);
        await this.loadPHPVersions();
        await this.loadPHPInfo();
      } else {
        this.showMessage('error', response?.message || 'Erro ao definir versão padrão');
      }
    } catch (error) {
      this.showMessage('error', 'Erro ao definir versão padrão');
    } finally {
      this.actionInProgress = false;
    }
  }

  async removeVersion(version: string) {
    if (!confirm(`Tem certeza que deseja remover o PHP ${version}?`)) {
      return;
    }

    this.actionInProgress = true;
    try {
      const response = await this.packageService.uninstallPackageVersion('php', version).toPromise();
      if (response?.success) {
        this.showMessage('success', `PHP ${version} removido com sucesso!`);
        await this.loadPHPVersions();
      } else {
        this.showMessage('error', response?.message || 'Erro ao remover versão');
      }
    } catch (error) {
      this.showMessage('error', 'Erro ao remover versão do PHP');
    } finally {
      this.actionInProgress = false;
    }
  }

  getFilteredExtensions(): string[] {
    if (!this.phpInfo?.extensions) return [];
    
    return this.phpInfo.extensions.filter(ext => 
      ext.toLowerCase().includes(this.extensionFilter.toLowerCase())
    );
  }

  viewPHPInfo() {
    this.showMessage('info', 'Funcionalidade phpinfo() será implementada');
  }

  editPHPIni() {
    this.showMessage('info', 'Editor do php.ini será implementado');
  }

  restartPHPFPM() {
    this.showMessage('info', 'Reinício do PHP-FPM será implementado');
  }

  viewLogs() {
    this.showMessage('info', 'Visualização de logs será implementada');
  }

  showMessage(type: 'success' | 'error' | 'info', text: string) {
    this.message = { type, text };
    setTimeout(() => this.clearMessage(), 5000);
  }

  clearMessage() {
    this.message = null;
  }

  getMessageIcon(): string {
    if (!this.message) return '';
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      info: 'fas fa-info-circle'
    };
    
    return icons[this.message.type];
  }

  goBack() {
    this.router.navigate(['/packages']);
  }
}
