import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { 
  SystemService, 
  UserService, 
  ServiceService, 
  NetworkService,
  PackageService 
} from '../../core/services';

interface DashboardStats {
  system: {
    hostname: string;
    uptime: number;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    load_average: number[];
  };
  users: {
    total: number;
    online: number;
  };
  services: {
    active: number;
    inactive: number;
    failed: number;
  };
  network: {
    interfaces: number;
    connections: number;
  };
  packages: {
    total: number;
    upgradable: number;
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatGridListModule,
    RouterModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dashboard-container">
      <h1>Server Admin Dashboard</h1>
      
      <div class="stats-grid" *ngIf="!loading">
        <!-- System Info Card -->
        <mat-card class="dashboard-card">
          <mat-card-header>
            <div mat-card-avatar>
              <mat-icon>computer</mat-icon>
            </div>
            <mat-card-title>Sistema</mat-card-title>
            <mat-card-subtitle>{{stats?.system?.hostname || 'N/A'}}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="metric">
              <span class="label">Uptime:</span>
              <span class="value">{{formatUptime(stats?.system?.uptime || 0)}}</span>
            </div>
            <div class="metric">
              <span class="label">CPU:</span>
              <span class="value">{{stats?.system?.cpu_usage?.toFixed(1) || 0}}%</span>
            </div>
            <div class="metric">
              <span class="label">Memória:</span>
              <span class="value">{{stats?.system?.memory_usage?.toFixed(1) || 0}}%</span>
            </div>
            <div class="metric">
              <span class="label">Disco:</span>
              <span class="value">{{stats?.system?.disk_usage?.toFixed(1) || 0}}%</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Users Card -->
        <mat-card class="dashboard-card">
          <mat-card-header>
            <div mat-card-avatar>
              <mat-icon>people</mat-icon>
            </div>
            <mat-card-title>Usuários</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="metric">
              <span class="label">Total:</span>
              <span class="value">{{stats?.users?.total || 0}}</span>
            </div>
            <div class="metric">
              <span class="label">Online:</span>
              <span class="value online">{{stats?.users?.online || 0}}</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button routerLink="/users">
              <mat-icon>arrow_forward</mat-icon>
              Gerenciar
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Services Card -->
        <mat-card class="dashboard-card">
          <mat-card-header>
            <div mat-card-avatar>
              <mat-icon>settings</mat-icon>
            </div>
            <mat-card-title>Serviços</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="metric">
              <span class="label">Ativos:</span>
              <span class="value online">{{stats?.services?.active || 0}}</span>
            </div>
            <div class="metric">
              <span class="label">Inativos:</span>
              <span class="value">{{stats?.services?.inactive || 0}}</span>
            </div>
            <div class="metric" *ngIf="stats?.services?.failed && (stats?.services?.failed || 0) > 0">
              <span class="label">Falharam:</span>
              <span class="value error">{{stats?.services?.failed}}</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button routerLink="/services">
              <mat-icon>arrow_forward</mat-icon>
              Gerenciar
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Network Card -->
        <mat-card class="dashboard-card">
          <mat-card-header>
            <div mat-card-avatar>
              <mat-icon>network_check</mat-icon>
            </div>
            <mat-card-title>Rede</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="metric">
              <span class="label">Interfaces:</span>
              <span class="value">{{stats?.network?.interfaces || 0}}</span>
            </div>
            <div class="metric">
              <span class="label">Conexões:</span>
              <span class="value">{{stats?.network?.connections || 0}}</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button routerLink="/network">
              <mat-icon>arrow_forward</mat-icon>
              Ver Detalhes
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Packages Card -->
        <mat-card class="dashboard-card">
          <mat-card-header>
            <div mat-card-avatar>
              <mat-icon>inventory</mat-icon>
            </div>
            <mat-card-title>Pacotes</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="metric">
              <span class="label">Instalados:</span>
              <span class="value">{{stats?.packages?.total || 0}}</span>
            </div>
            <div class="metric" *ngIf="stats?.packages?.upgradable && (stats?.packages?.upgradable || 0) > 0">
              <span class="label">Atualizações:</span>
              <span class="value warning">{{stats?.packages?.upgradable}}</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button routerLink="/packages">
              <mat-icon>arrow_forward</mat-icon>
              Gerenciar
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- API Status Card -->
        <mat-card class="dashboard-card">
          <mat-card-header>
            <div mat-card-avatar>
              <mat-icon>api</mat-icon>
            </div>
            <mat-card-title>Status da API</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="api-status">
              <span class="label">Conexão:</span>
              <span class="status" [class.online]="apiStatus" [class.offline]="!apiStatus">
                {{apiStatus ? 'Online' : 'Offline'}}
              </span>
            </div>
            <div class="api-url">
              Backend: {{ environment.apiUrl }}
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button (click)="refreshData()">
              <mat-icon>refresh</mat-icon>
              Atualizar
            </button>
            <button mat-button (click)="openApiDocs()">
              <mat-icon>description</mat-icon>
              Docs
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div class="loading-container" *ngIf="loading">
        <mat-spinner></mat-spinner>
        <p>Carregando dados do dashboard...</p>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: var(--primary-color);
      margin-bottom: 30px;
      text-align: center;
      font-weight: 300;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .dashboard-card {
      min-height: 200px;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      padding: 4px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .value {
      font-weight: bold;
      color: var(--primary-color);
    }

    .value.online {
      color: var(--success-color);
    }

    .value.warning {
      color: var(--warning-color);
    }

    .value.error {
      color: var(--error-color);
    }

    .api-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .status {
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 12px;
    }

    .status.online {
      background-color: var(--success-bg);
      color: var(--success-color);
    }

    .status.offline {
      background-color: var(--error-bg);
      color: var(--error-color);
    }

    .api-url {
      font-family: monospace;
      color: var(--text-secondary);
      font-size: 12px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      gap: 20px;
    }

    .loading-container p {
      color: var(--text-secondary);
      font-size: 16px;
    }

    mat-card-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--primary-color) !important;
      color: white !important;
    }

    mat-card-actions {
      padding: 8px 16px !important;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .dashboard-container {
        padding: 10px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading = true;
  apiStatus = false;
  environment = environment;

  constructor(
    private systemService: SystemService,
    private userService: UserService,
    private serviceService: ServiceService,
    private networkService: NetworkService,
    private packageService: PackageService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading = true;
    try {
      // Load all data in parallel
      const [systemInfo, users, services, networkInterfaces, networkConnections] = await Promise.all([
        this.systemService.getSystemInfo().toPromise(),
        this.userService.getUsers().toPromise(),
        this.serviceService.getServices().toPromise(),
        this.networkService.getNetworkInterfaces().toPromise(),
        this.networkService.getNetworkConnections().toPromise()
      ]);

      // Get online users count - this would need to be implemented in the backend
      let onlineUsers = 0;

      this.stats = {
        system: {
          hostname: systemInfo?.hostname || 'Unknown',
          uptime: typeof systemInfo?.uptime === 'string' ? 0 : (systemInfo?.uptime || 0),
          cpu_usage: systemInfo?.cpu_usage || 0,
          memory_usage: systemInfo?.memory_usage || 0,
          disk_usage: systemInfo?.disk_usage || 0,
          load_average: systemInfo?.load_average || [0, 0, 0]
        },
        users: {
          total: users?.length || 0,
          online: onlineUsers
        },
        services: {
          active: services?.filter((s: any) => s.active_state === 'active').length || 0,
          inactive: services?.filter((s: any) => s.active_state === 'inactive').length || 0,
          failed: services?.filter((s: any) => s.active_state === 'failed').length || 0
        },
        network: {
          interfaces: networkInterfaces?.length || 0,
          connections: networkConnections?.length || 0
        },
        packages: {
          total: 0, // Will be loaded separately
          upgradable: 0
        }
      };

      this.apiStatus = true;
      this.loadPackageInfo();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.apiStatus = false;
      this.stats = this.getDefaultStats();
    } finally {
      this.loading = false;
    }
  }

  private async loadPackageInfo() {
    try {
      const upgradable = await this.packageService.getUpgradablePackages().toPromise();
      
      if (this.stats) {
        this.stats.packages = {
          total: 0, // This would require a different API call
          upgradable: upgradable?.length || 0
        };
      }
    } catch (error) {
      console.error('Error loading package info:', error);
    }
  }

  private getDefaultStats(): DashboardStats {
    return {
      system: {
        hostname: 'Unknown',
        uptime: 0,
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0,
        load_average: [0, 0, 0]
      },
      users: {
        total: 0,
        online: 0
      },
      services: {
        active: 0,
        inactive: 0,
        failed: 0
      },
      network: {
        interfaces: 0,
        connections: 0
      },
      packages: {
        total: 0,
        upgradable: 0
      }
    };
  }

  refreshData() {
    this.loadDashboardData();
  }

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  openApiDocs() {
    const base = environment.apiUrl.replace('/api/v1','');
    window.open(base + '/docs', '_blank');
  }
}
