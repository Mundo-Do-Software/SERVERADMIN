import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="packages-container">
      <div class="page-header">
        <h2>📦 Instalação de Pacotes</h2>
      </div>

      <!-- Quick Install Section -->
      <div class="grid grid-2 mb-20">
        <div class="card">
          <div class="card-header">
            <h3>🚀 Instalação Rápida - Hosting</h3>
          </div>
          <div class="card-body">
            <p>Instale os pacotes essenciais para hosting web:</p>
            <div class="quick-packages">
              <button class="btn btn-primary" (click)="installPackageSet('hosting')">
                <i class="fas fa-download"></i> Instalar Stack Hosting
              </button>
            </div>
            <div class="package-list">
              <small>Inclui: nginx, apache2, mysql-server, php, node.js, git, curl, wget, ufw</small>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>🔧 Instalação Rápida - Desenvolvimento</h3>
          </div>
          <div class="card-body">
            <p>Instale ferramentas de desenvolvimento:</p>
            <div class="quick-packages">
              <button class="btn btn-success" (click)="installPackageSet('development')">
                <i class="fas fa-code"></i> Instalar Stack Dev
              </button>
            </div>
            <div class="package-list">
              <small>Inclui: docker, docker-compose, git, vim, build-essential, python3-pip</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Individual Package Installation -->
      <div class="card mb-20">
        <div class="card-header">
          <h3>Instalação Individual</h3>
        </div>
        <div class="card-body">
          <form (ngSubmit)="installSinglePackage()" class="package-form">
            <div class="form-group">
              <label>Nome do Pacote:</label>
              <input type="text" class="form-control" [(ngModel)]="packageName" name="packageName" 
                     placeholder="Ex: nginx, docker, mysql-server" required>
            </div>
            <button type="submit" class="btn btn-primary" [disabled]="!packageName || isInstalling">
              <span *ngIf="isInstalling" class="loading"></span>
              <i class="fas fa-download"></i> Instalar Pacote
            </button>
          </form>
        </div>
      </div>

      <!-- Popular Packages -->
      <div class="card mb-20">
        <div class="card-header">
          <h3>📋 Pacotes Populares</h3>
        </div>
        <div class="card-body">
          <div class="grid grid-4">
            <div *ngFor="let pkg of popularPackages" class="package-card">
              <div class="package-icon">
                <i [class]="pkg.icon"></i>
              </div>
              <div class="package-info">
                <h4>{{ pkg.name }}</h4>
                <p>{{ pkg.description }}</p>
                <span class="status-badge" [class]="pkg.installed ? 'status-active' : 'status-inactive'">
                  {{ pkg.installed ? 'Instalado' : 'Não Instalado' }}
                </span>
              </div>
              <div class="package-actions">
                <button class="btn btn-sm" [class]="pkg.installed ? 'btn-warning' : 'btn-primary'" 
                        (click)="togglePackage(pkg)">
                  <i [class]="pkg.installed ? 'fas fa-trash' : 'fas fa-download'"></i>
                  {{ pkg.installed ? 'Remover' : 'Instalar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Installation Log -->
      <div class="card" *ngIf="installationLog.length > 0">
        <div class="card-header">
          <h3>📄 Log de Instalação</h3>
          <button class="btn btn-secondary" (click)="clearLog()">
            <i class="fas fa-trash"></i> Limpar Log
          </button>
        </div>
        <div class="card-body">
          <div class="log-container">
            <div *ngFor="let entry of installationLog" class="log-entry" [class]="entry.type">
              <span class="log-time">{{ entry.time }}</span>
              <span class="log-message">{{ entry.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Messages -->
      <div *ngIf="message" class="alert" [class.alert-success]="!isError" [class.alert-error]="isError">
        {{ message }}
      </div>
    </div>
  `,
  styles: [`
    .packages-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 30px;
      padding: 20px 0;
      border-bottom: 2px solid #e2e8f0;
    }

    .page-header h2 {
      margin: 0;
      color: #2d3748;
      font-size: 2rem;
      font-weight: 600;
    }

    .package-form {
      display: flex;
      gap: 15px;
      align-items: end;
    }

    .package-form .form-group {
      flex: 1;
      margin-bottom: 0;
    }

    .quick-packages {
      margin: 15px 0;
    }

    .package-list {
      margin-top: 10px;
      color: #666;
    }

    .package-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: all 0.3s ease;
    }

    .package-card:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .package-icon {
      font-size: 2rem;
      color: #667eea;
      margin-bottom: 15px;
    }

    .package-info h4 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .package-info p {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 0.9rem;
    }

    .package-actions {
      margin-top: 15px;
    }

    .log-container {
      max-height: 400px;
      overflow-y: auto;
      background: #1a202c;
      border-radius: 8px;
      padding: 15px;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .log-entry {
      margin-bottom: 5px;
      display: flex;
      gap: 10px;
    }

    .log-entry.success {
      color: #68d391;
    }

    .log-entry.error {
      color: #fc8181;
    }

    .log-entry.info {
      color: #90cdf4;
    }

    .log-time {
      color: #a0aec0;
      font-size: 0.8rem;
      min-width: 80px;
    }

    .log-message {
      flex: 1;
    }

    .alert {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1001;
    }

    .alert-success {
      background: #48bb78;
    }

    .alert-error {
      background: #f56565;
    }
  `]
})
export class PackagesComponent implements OnInit {
  packageName = '';
  isInstalling = false;
  message = '';
  isError = false;
  installationLog: any[] = [];

  popularPackages = [
    {
      name: 'Nginx',
      description: 'Servidor web de alta performance',
      icon: 'fas fa-server',
      installed: true
    },
    {
      name: 'Docker',
      description: 'Plataforma de containerização',
      icon: 'fab fa-docker',
      installed: false
    },
    {
      name: 'Node.js',
      description: 'Runtime JavaScript',
      icon: 'fab fa-node-js',
      installed: true
    },
    {
      name: 'PHP',
      description: 'Linguagem de programação web',
      icon: 'fab fa-php',
      installed: false
    },
    {
      name: 'MySQL',
      description: 'Sistema de banco de dados',
      icon: 'fas fa-database',
      installed: false
    },
    {
      name: 'Git',
      description: 'Sistema de controle de versão',
      icon: 'fab fa-git-alt',
      installed: true
    },
    {
      name: '.NET Core',
      description: 'Framework de desenvolvimento',
      icon: 'fas fa-code',
      installed: false
    },
    {
      name: 'UFW',
      description: 'Firewall Uncomplicated',
      icon: 'fas fa-shield-alt',
      installed: true
    }
  ];

  constructor() {}

  ngOnInit() {
    this.addLogEntry('Sistema de pacotes inicializado', 'info');
  }

  installPackageSet(type: string) {
    this.isInstalling = true;
    let packages: string[] = [];
    
    if (type === 'hosting') {
      packages = ['nginx', 'apache2', 'mysql-server', 'php', 'nodejs', 'git', 'curl', 'wget', 'ufw'];
    } else if (type === 'development') {
      packages = ['docker.io', 'docker-compose', 'git', 'vim', 'build-essential', 'python3-pip'];
    }

    this.addLogEntry(`Iniciando instalação do conjunto: ${type}`, 'info');
    
    // Simulate installation
    let index = 0;
    const installNext = () => {
      if (index < packages.length) {
        const pkg = packages[index];
        this.addLogEntry(`Instalando ${pkg}...`, 'info');
        
        setTimeout(() => {
          this.addLogEntry(`${pkg} instalado com sucesso!`, 'success');
          index++;
          installNext();
        }, 1000);
      } else {
        this.isInstalling = false;
        this.showMessage(`Conjunto ${type} instalado com sucesso!`);
        this.addLogEntry(`Instalação do conjunto ${type} concluída!`, 'success');
      }
    };

    installNext();
  }

  installSinglePackage() {
    if (!this.packageName) return;

    this.isInstalling = true;
    this.addLogEntry(`Instalando ${this.packageName}...`, 'info');

    // Simulate installation
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        this.addLogEntry(`${this.packageName} instalado com sucesso!`, 'success');
        this.showMessage(`Pacote ${this.packageName} instalado com sucesso!`);
      } else {
        this.addLogEntry(`Erro ao instalar ${this.packageName}`, 'error');
        this.showMessage(`Erro ao instalar ${this.packageName}`, true);
      }
      
      this.isInstalling = false;
      this.packageName = '';
    }, 2000);
  }

  togglePackage(pkg: any) {
    const action = pkg.installed ? 'Removendo' : 'Instalando';
    this.addLogEntry(`${action} ${pkg.name}...`, 'info');
    
    setTimeout(() => {
      pkg.installed = !pkg.installed;
      const status = pkg.installed ? 'instalado' : 'removido';
      this.addLogEntry(`${pkg.name} ${status} com sucesso!`, 'success');
      this.showMessage(`${pkg.name} ${status} com sucesso!`);
    }, 1500);
  }

  addLogEntry(message: string, type: string) {
    this.installationLog.push({
      time: new Date().toLocaleTimeString(),
      message,
      type
    });
  }

  clearLog() {
    this.installationLog = [];
  }

  showMessage(msg: string, isError = false) {
    this.message = msg;
    this.isError = isError;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}
