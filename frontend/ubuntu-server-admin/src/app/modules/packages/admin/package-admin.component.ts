import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PackageService, PackageInfo } from '../../../services/package.service';

@Component({
  selector: 'app-package-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="package-admin-container">
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <i class="fas fa-arrow-left"></i>
          Voltar para Pacotes
        </button>
        <div class="package-info" *ngIf="packageInfo">
          <div class="package-icon">
            <i [class]="getPackageIcon(packageInfo.id)"></i>
          </div>
          <div class="package-details">
            <h1>{{ packageInfo.name }}</h1>
            <p>{{ packageInfo.description }}</p>
            <span class="status-badge" [class]="packageInfo.status">
              {{ getStatusText(packageInfo.status) }}
            </span>
          </div>
        </div>
      </div>

      <div class="admin-content" *ngIf="packageInfo">
        <div class="loading" *ngIf="loading">
          <div class="spinner"></div>
          <p>Carregando painel de administração...</p>
        </div>

        <div class="admin-panel" *ngIf="!loading">
          <div class="panel-placeholder">
            <div class="placeholder-icon">
              <i [class]="getPackageIcon(packageInfo.id)"></i>
            </div>
            <h2>Painel de Administração - {{ packageInfo.name }}</h2>
            <p>Painel específico para administração do {{ packageInfo.name }} será implementado aqui.</p>
            
            <div class="quick-actions">
              <button class="action-btn primary" *ngIf="!packageInfo.installed" (click)="installPackage()">
                <i class="fas fa-download"></i>
                Instalar Pacote
              </button>
              
              <button class="action-btn warning" *ngIf="packageInfo.installed" (click)="restartService()">
                <i class="fas fa-redo"></i>
                Reiniciar Serviço
              </button>
              
              <button class="action-btn info" (click)="viewLogs()">
                <i class="fas fa-file-alt"></i>
                Ver Logs
              </button>
              
              <button class="action-btn secondary" (click)="openConfig()">
                <i class="fas fa-cog"></i>
                Configurações
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="error-state" *ngIf="error">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h2>Erro ao carregar painel</h2>
        <p>{{ error }}</p>
        <button class="retry-btn" (click)="loadPackageInfo()">
          <i class="fas fa-redo"></i>
          Tentar novamente
        </button>
      </div>
    </div>
  `,
  styles: [`
    .package-admin-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 2rem;
    }

    .back-btn {
      background: none;
      border: none;
      color: var(--primary-color);
      font-size: 0.9rem;
      cursor: pointer;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: color 0.2s;

      &:hover {
        color: var(--primary-color-dark);
      }
    }

    .package-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: var(--card-bg);
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }

    .package-icon {
      width: 4rem;
      height: 4rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-color);
      color: white;
      border-radius: 12px;
      font-size: 1.5rem;
    }

    .package-details h1 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
    }

    .package-details p {
      margin: 0 0 1rem 0;
      color: var(--text-secondary);
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;

      &.installed {
        background: var(--success-bg);
        color: var(--success-color);
      }

      &.available {
        background: var(--warning-bg);
        color: var(--warning-color);
      }
    }

    .admin-content {
      margin-top: 2rem;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--border-color);
      border-top: 3px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .panel-placeholder {
      text-align: center;
      padding: 3rem;
      background: var(--card-bg);
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }

    .placeholder-icon {
      width: 5rem;
      height: 5rem;
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-color);
      color: white;
      border-radius: 50%;
      font-size: 2rem;
    }

    .quick-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;

      &.primary {
        background: var(--primary-color);
        color: white;
        &:hover { background: var(--primary-color-dark); }
      }

      &.warning {
        background: var(--warning-color);
        color: white;
        &:hover { opacity: 0.9; }
      }

      &.info {
        background: var(--info-color);
        color: white;
        &:hover { opacity: 0.9; }
      }

      &.secondary {
        background: var(--border-color);
        color: var(--text-primary);
        &:hover { background: var(--text-secondary); color: white; }
      }
    }

    .error-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .error-icon {
      font-size: 3rem;
      color: var(--error-color);
      margin-bottom: 1rem;
    }

    .retry-btn {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: background 0.2s;

      &:hover {
        background: var(--primary-color-dark);
      }
    }
  `]
})
export class PackageAdminComponent implements OnInit {
  packageInfo: PackageInfo | null = null;
  loading = true;
  error: string | null = null;
  packageId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private packageService: PackageService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.packageId = id;
        this.loadPackageInfo();
      }
    });
  }

  loadPackageInfo() {
    this.loading = true;
    this.error = null;

    this.packageService.getPackageDetails(this.packageId).subscribe({
      next: (packageInfo) => {
        this.packageInfo = packageInfo;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Erro ao carregar informações do pacote';
        this.loading = false;
        console.error('Erro ao carregar pacote:', error);
      }
    });
  }

  getPackageIcon(packageId: string): string {
    const iconMap: { [key: string]: string } = {
      'mysql-server': 'fas fa-database',
      'postgresql': 'fas fa-database',
      'nginx': 'fas fa-server',
      'apache2': 'fas fa-server',
      'redis-server': 'fas fa-memory',
      'docker': 'fab fa-docker',
      'grafana': 'fas fa-chart-line',
      'prometheus': 'fas fa-chart-area',
      'jenkins': 'fas fa-tools',
      'gitlab': 'fab fa-gitlab',
      'nextcloud': 'fas fa-cloud',
      'wordpress': 'fab fa-wordpress',
      'phpmyadmin': 'fas fa-database',
      'adminer': 'fas fa-database',
      'portainer': 'fab fa-docker',
      'webmin': 'fas fa-cogs'
    };
    
    return iconMap[packageId] || 'fas fa-cube';
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'installed': 'Instalado',
      'available': 'Disponível',
      'updating': 'Atualizando',
      'error': 'Erro'
    };
    
    return statusMap[status] || status;
  }

  goBack() {
    this.router.navigate(['/packages']);
  }

  installPackage() {
    if (this.packageInfo) {
      this.packageService.installPackage({ packageId: this.packageInfo.id }).subscribe({
        next: (response) => {
          console.log('Pacote instalado:', response);
          this.loadPackageInfo(); // Recarregar info
        },
        error: (error) => {
          console.error('Erro ao instalar pacote:', error);
        }
      });
    }
  }

  restartService() {
    console.log('Reiniciar serviço - implementar');
  }

  viewLogs() {
    console.log('Ver logs - implementar');
  }

  openConfig() {
    console.log('Abrir configurações - implementar');
  }
}
