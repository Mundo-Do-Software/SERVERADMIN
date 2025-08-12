import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  WebserverService, 
  NginxSite, 
  NginxStatus, 
  CreateSiteRequest, 
  CertbotStatus, 
  CertbotCertificate, 
  CertificateRequest 
} from '../../../services/webserver.service';

@Component({
  selector: 'app-nginx-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="nginx-admin-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <i class="fas fa-arrow-left"></i>
          Voltar para Pacotes
        </button>
        <div class="nginx-header">
          <div class="nginx-icon">🌐</div>
          <div class="header-info">
            <h1>Administração NGINX</h1>
            <p>Gerencie sites, certificados SSL e configurações do servidor web</p>
            <div class="status-indicator" [class.online]="isOnline" [class.offline]="!isOnline">
              <i [class]="isOnline ? 'fas fa-circle' : 'fas fa-times-circle'"></i>
              {{isOnline ? 'Online' : 'Offline'}}
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Carregando informações do NGINX...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading" class="content-grid">
        <!-- Server Status -->
        <div class="panel status-panel">
          <div class="panel-header">
            <h2>📊 Status do Servidor</h2>
            <button class="refresh-btn" (click)="loadStatus()">
              <i class="fas fa-sync"></i>
            </button>
          </div>
          <div class="panel-content">
            <div class="status-grid">
              <div class="status-item">
                <span class="status-label">Versão:</span>
                <span class="status-value">{{nginxStatus?.version || 'N/A'}}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Uptime:</span>
                <span class="status-value">{{nginxStatus?.uptime || 'N/A'}}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Sites Habilitados:</span>
                <span class="status-value">{{nginxStatus?.sites_enabled || 0}}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Sites Disponíveis:</span>
                <span class="status-value">{{nginxStatus?.sites_available || 0}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sites -->
        <div class="panel sites-panel">
          <div class="panel-header">
            <h2>🌍 Sites Configurados</h2>
            <button class="add-btn" (click)="showCreateSite = true">
              <i class="fas fa-plus"></i>
              Novo Site
            </button>
          </div>
          <div class="panel-content">
            <div class="sites-list">
              <div *ngFor="let site of sites" class="site-item" [class.enabled]="site.enabled" [class.disabled]="!site.enabled">
                <div class="site-info">
                  <div class="site-header">
                    <span class="site-name">{{site.name}}</span>
                    <div class="site-badges">
                      <span class="badge" [class.enabled]="site.enabled" [class.disabled]="!site.enabled">
                        {{site.enabled ? 'Habilitado' : 'Desabilitado'}}
                      </span>
                      <span class="badge type">{{site.type}}</span>
                      <span *ngIf="site.ssl_enabled" class="badge ssl">SSL</span>
                    </div>
                  </div>
                  <div class="site-details">
                    <span class="domain">{{site.server_name}}:{{site.port}}</span>
                  </div>
                  <span class="site-created">Modificado: {{site.modified}}</span>
                </div>
                <div class="site-actions">
                  <button class="btn-icon" 
                          title="Habilitar/Desabilitar" 
                          (click)="toggleSite(site)">
                    <i [class]="site.enabled ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                  <button class="btn-icon danger" title="Excluir" (click)="deleteSite(site.name)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Create Site Form -->
            <div *ngIf="showCreateSite" class="create-form">
              <h3>Criar Novo Site</h3>
              <div class="form-group">
                <label>Nome do Site:</label>
                <input type="text" [(ngModel)]="newSite.name" placeholder="meusite">
              </div>
              <div class="form-group">
                <label>Domínio/Server Name:</label>
                <input type="text" [(ngModel)]="newSite.server_name" placeholder="exemplo.com">
              </div>
              <div class="form-group">
                <label>Porta:</label>
                <input type="text" [(ngModel)]="newSite.port" placeholder="80">
              </div>
              <div class="form-group">
                <label>Tipo:</label>
                <select [(ngModel)]="newSite.type">
                  <option value="static">Site Estático</option>
                  <option value="php">PHP</option>
                  <option value="proxy">Proxy Reverso</option>
                </select>
              </div>
              <div class="form-group" *ngIf="newSite.type === 'static' || newSite.type === 'php'">
                <label>Diretório Root:</label>
                <input type="text" [(ngModel)]="newSite.root_path" placeholder="/var/www/html">
              </div>
              <div class="form-group" *ngIf="newSite.type === 'proxy'">
                <label>Proxy URL:</label>
                <input type="text" [(ngModel)]="newSite.proxy_url" placeholder="http://localhost:3000">
              </div>
              <div class="form-actions">
                <button class="btn create-btn" (click)="createSite()">Criar</button>
                <button class="btn cancel-btn" (click)="cancelCreateSite()">Cancelar</button>
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
              <button class="action-card" (click)="testConfig()">
                <i class="fas fa-check"></i>
                <span>Testar Config</span>
              </button>
              
              <button class="action-card" (click)="reloadConfig()">
                <i class="fas fa-sync"></i>
                <span>Recarregar</span>
              </button>
              
              <button class="action-card" (click)="startService()" *ngIf="!isOnline">
                <i class="fas fa-play"></i>
                <span>Iniciar</span>
              </button>
              
              <button class="action-card" (click)="stopService()" *ngIf="isOnline">
                <i class="fas fa-stop"></i>
                <span>Parar</span>
              </button>
              
              <button class="action-card" (click)="restartService()">
                <i class="fas fa-redo"></i>
                <span>Reiniciar</span>
              </button>
              
              <button class="action-card" (click)="viewLogs()">
                <i class="fas fa-file-alt"></i>
                <span>Ver Logs</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- SSL Certificates & Certbot -->
      <div class="section">
        <div class="section-header">
          <h3>🔒 SSL Certificates (Certbot)</h3>
          <div class="certbot-status" [class.installed]="certbotStatus?.installed" [class.not-installed]="!certbotStatus?.installed">
            <i [class]="certbotStatus?.installed ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'"></i>
            {{ certbotStatus?.installed ? 'Certbot Installed' : 'Certbot Not Installed' }}
          </div>
        </div>

        <!-- Install Certbot -->
        <div *ngIf="!certbotStatus?.installed" class="certbot-install">
          <div class="install-message">
            <i class="fas fa-info-circle"></i>
            <span>Certbot não está instalado. Instale para gerenciar certificados SSL automaticamente.</span>
          </div>
          <button class="action-btn install-btn" (click)="installCertbot()" [disabled]="loading">
            <i class="fas fa-download"></i>
            Instalar Certbot
          </button>
        </div>

        <!-- Certbot Management -->
        <div *ngIf="certbotStatus?.installed" class="certbot-management">
          <!-- Auto Renewal Status -->
          <div class="auto-renewal-section">
            <div class="renewal-info">
              <span class="label">Renovação Automática:</span>
              <span class="status" [class.enabled]="certbotStatus?.auto_renewal" [class.disabled]="!certbotStatus?.auto_renewal">
                {{ certbotStatus?.auto_renewal ? 'Habilitada' : 'Desabilitada' }}
              </span>
            </div>
            <div class="renewal-actions">
              <button 
                class="action-btn" 
                [class.success]="!certbotStatus?.auto_renewal" 
                [class.warning]="certbotStatus?.auto_renewal"
                (click)="toggleAutoRenewal()"
                [disabled]="loading">
                {{ certbotStatus?.auto_renewal ? 'Desabilitar' : 'Habilitar' }} Auto-Renovação
              </button>
              <button class="action-btn primary" (click)="renewCertificates()" [disabled]="loading">
                <i class="fas fa-sync"></i>
                Renovar Certificados
              </button>
            </div>
          </div>

          <!-- Add New Certificate -->
          <div class="add-certificate-section">
            <h4>Adicionar Certificado SSL</h4>
            <div class="cert-form">
              <div class="form-row">
                <div class="form-group">
                  <label>Domínio:</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newCertificate.domain" 
                    placeholder="exemplo.com"
                    class="form-input">
                </div>
                <div class="form-group">
                  <label>Email:</label>
                  <input 
                    type="email" 
                    [(ngModel)]="newCertificate.email" 
                    placeholder="admin@exemplo.com"
                    class="form-input">
                </div>
                <div class="form-group">
                  <button 
                    class="action-btn success" 
                    (click)="obtainCertificate()"
                    [disabled]="!newCertificate.domain || !newCertificate.email || loading">
                    <i class="fas fa-certificate"></i>
                    Obter Certificado
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Existing Certificates -->
          <div class="certificates-section" *ngIf="certbotStatus && certbotStatus.certificates && certbotStatus.certificates.length > 0">
            <h4>Certificados Existentes</h4>
            <div class="certificates-grid">
              <div class="certificate-card" *ngFor="let cert of certbotStatus!.certificates">
                <div class="cert-header">
                  <div class="cert-name">{{ cert.name }}</div>
                  <div class="cert-status" [class.valid]="cert.status === 'valid'" [class.invalid]="cert.status === 'invalid'">
                    <i [class]="cert.status === 'valid' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'"></i>
                    {{ cert.status === 'valid' ? 'Válido' : 'Inválido' }}
                  </div>
                </div>
                <div class="cert-info">
                  <div class="cert-domains">
                    <strong>Domínios:</strong>
                    <span class="domains-list">{{ cert.domains.join(', ') }}</span>
                  </div>
                  <div class="cert-expiry">
                    <strong>Expira em:</strong>
                    <span class="expiry-date">{{ cert.expiry }}</span>
                  </div>
                </div>
                <div class="cert-actions">
                  <button class="action-btn danger small" (click)="revokeCertificate(cert.name)" [disabled]="loading">
                    <i class="fas fa-trash"></i>
                    Revogar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- No Certificates -->
          <div *ngIf="certbotStatus && certbotStatus.certificates && certbotStatus.certificates.length === 0" class="no-certificates">
            <i class="fas fa-certificate"></i>
            <span>Nenhum certificado SSL configurado</span>
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
  styleUrls: ['./nginx.component.scss']
})
export class NginxComponent implements OnInit {
  loading = true;
  isOnline = true;
  
  showCreateSite = false;
  
  nginxStatus: NginxStatus | null = null;
  sites: NginxSite[] = [];
  certbotStatus: CertbotStatus | null = null;
  
  newSite = { 
    name: '', 
    server_name: '', 
    port: '80',
    type: 'static' as 'static' | 'php' | 'proxy', 
    root_path: '/var/www/html', 
    proxy_url: ''
  };

  newCertificate: CertificateRequest = {
    domain: '',
    email: ''
  };

  message: { type: 'success' | 'error' | 'info'; text: string } | null = null;

  constructor(private router: Router, private webserverService: WebserverService) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadStatus(),
        this.loadSites()
      ]);
      this.loadCertbotStatus();
    } catch (error) {
      console.error('Erro ao carregar dados do NGINX:', error);
      this.showMessage('error', 'Erro ao carregar informações do NGINX');
    } finally {
      this.loading = false;
    }
  }

  async loadStatus() {
    try {
      this.webserverService.getNginxStatus().subscribe({
        next: (status) => {
          this.nginxStatus = status;
          this.isOnline = status?.online || false;
        },
        error: (error) => {
          console.error('Erro ao carregar status:', error);
          this.isOnline = false;
          this.nginxStatus = null;
        }
      });
    } catch (error) {
      console.error('Erro ao carregar status:', error);
      this.isOnline = false;
      this.nginxStatus = null;
    }
  }

  async loadSites() {
    try {
      this.webserverService.getSites().subscribe({
        next: (sites) => {
          this.sites = sites || [];
        },
        error: (error) => {
          console.error('Erro ao carregar sites:', error);
          this.sites = [];
        }
      });
    } catch (error) {
      console.error('Erro ao carregar sites:', error);
      this.sites = [];
    }
  }

  createSite() {
    if (!this.newSite.name.trim() || !this.newSite.server_name.trim()) {
      this.showMessage('error', 'Nome e domínio são obrigatórios');
      return;
    }

    this.webserverService.createSite(this.newSite).subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.cancelCreateSite();
        this.loadSites(); // Recarregar lista
      },
      error: (error) => {
        console.error('Erro ao criar site:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao criar site');
      }
    });
  }

  cancelCreateSite() {
    this.showCreateSite = false;
    this.newSite = { 
      name: '', 
      server_name: '', 
      port: '80',
      type: 'static', 
      root_path: '/var/www/html', 
      proxy_url: ''
    };
  }

  toggleSite(site: NginxSite) {
    if (site.enabled) {
      this.webserverService.disableSite(site.name).subscribe({
        next: (response) => {
          this.showMessage('success', response.message);
          this.loadSites(); // Recarregar lista
        },
        error: (error) => {
          console.error('Erro ao desabilitar site:', error);
          this.showMessage('error', error.error?.detail || 'Erro ao desabilitar site');
        }
      });
    } else {
      this.webserverService.enableSite(site.name).subscribe({
        next: (response) => {
          this.showMessage('success', response.message);
          this.loadSites(); // Recarregar lista
        },
        error: (error) => {
          console.error('Erro ao habilitar site:', error);
          this.showMessage('error', error.error?.detail || 'Erro ao habilitar site');
        }
      });
    }
  }

  deleteSite(name: string) {
    if (confirm(`Tem certeza que deseja excluir o site ${name}?`)) {
      this.webserverService.deleteSite(name).subscribe({
        next: (response) => {
          this.showMessage('success', response.message);
          this.loadSites(); // Recarregar lista
        },
        error: (error) => {
          console.error('Erro ao excluir site:', error);
          this.showMessage('error', error.error?.detail || 'Erro ao excluir site');
        }
      });
    }
  }

  testConfig() {
    this.webserverService.testConfig().subscribe({
      next: (result) => {
        if (result.valid) {
          this.showMessage('success', result.message);
        } else {
          this.showMessage('error', result.message);
        }
      },
      error: (error) => {
        console.error('Erro ao testar configuração:', error);
        this.showMessage('error', 'Erro ao testar configuração do NGINX');
      }
    });
  }

  reloadConfig() {
    this.webserverService.reloadService().subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.loadStatus(); // Atualizar status
      },
      error: (error) => {
        console.error('Erro ao recarregar configuração:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao recarregar configuração');
      }
    });
  }

  startService() {
    this.webserverService.startService().subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.loadStatus(); // Atualizar status
      },
      error: (error) => {
        console.error('Erro ao iniciar serviço:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao iniciar serviço NGINX');
      }
    });
  }

  stopService() {
    this.webserverService.stopService().subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.loadStatus(); // Atualizar status
      },
      error: (error) => {
        console.error('Erro ao parar serviço:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao parar serviço NGINX');
      }
    });
  }

  restartService() {
    this.webserverService.restartService().subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.loadStatus(); // Atualizar status
      },
      error: (error) => {
        console.error('Erro ao reiniciar serviço:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao reiniciar serviço NGINX');
      }
    });
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

  // CERTBOT METHODS
  loadCertbotStatus() {
    this.webserverService.getCertbotStatus().subscribe({
      next: (status) => {
        this.certbotStatus = status;
      },
      error: (error) => {
        console.error('Erro ao carregar status do Certbot:', error);
      }
    });
  }

  installCertbot() {
    this.loading = true;
    this.webserverService.installCertbot().subscribe({
      next: (result) => {
        this.showMessage('success', result.message);
        this.loadCertbotStatus();
        this.loading = false;
      },
      error: (error: any) => {
        this.showMessage('error', error.error?.detail || 'Erro ao instalar Certbot');
        this.loading = false;
      }
    });
  }

  obtainCertificate() {
    if (!this.newCertificate.domain || !this.newCertificate.email) {
      this.showMessage('error', 'Domínio e email são obrigatórios');
      return;
    }

    this.loading = true;
    this.webserverService.obtainCertificate(this.newCertificate).subscribe({
      next: (result) => {
        this.showMessage('success', result.message);
        this.newCertificate = { domain: '', email: '' };
        this.loadCertbotStatus();
        this.loading = false;
      },
      error: (error: any) => {
        this.showMessage('error', error.error?.detail || 'Erro ao obter certificado');
        this.loading = false;
      }
    });
  }

  renewCertificates() {
    this.loading = true;
    this.webserverService.renewCertificates().subscribe({
      next: (result) => {
        this.showMessage('success', result.message);
        this.loadCertbotStatus();
        this.loading = false;
      },
      error: (error: any) => {
        this.showMessage('error', error.error?.detail || 'Erro ao renovar certificados');
        this.loading = false;
      }
    });
  }

  revokeCertificate(domain: string) {
    if (!confirm(`Tem certeza que deseja revogar o certificado para ${domain}?`)) {
      return;
    }

    this.loading = true;
    this.webserverService.revokeCertificate(domain).subscribe({
      next: (result) => {
        this.showMessage('success', result.message);
        this.loadCertbotStatus();
        this.loading = false;
      },
      error: (error: any) => {
        this.showMessage('error', error.error?.detail || 'Erro ao revogar certificado');
        this.loading = false;
      }
    });
  }

  toggleAutoRenewal() {
    const action = this.certbotStatus?.auto_renewal ? 'disable' : 'enable';
    this.loading = true;
    this.webserverService.manageAutoRenewal(action).subscribe({
      next: (result) => {
        this.showMessage('success', result.message);
        this.loadCertbotStatus();
        this.loading = false;
      },
      error: (error: any) => {
        this.showMessage('error', error.error?.detail || 'Erro ao gerenciar auto-renovação');
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/packages']);
  }
}
