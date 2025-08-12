import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../../services/database.service';

interface MySQLDatabase {
  name: string;
  size: string;
  tables: number;
  created: string;
}

interface MySQLUser {
  username: string;
  host: string;
  privileges: string[];
  created: string;
}

interface MySQLStatus {
  online: boolean;
  version: string | null;
  uptime: string | null;
  connections: number;
  queries: number;
  dataDir: string | null;
}

@Component({
  selector: 'app-mysql-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mysql-admin-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <i class="fas fa-arrow-left"></i>
          Voltar para Pacotes
        </button>
        <div class="mysql-header">
          <div class="mysql-icon">🗄️</div>
          <div class="header-info">
            <h1>Administração MySQL</h1>
            <p>Gerencie bancos de dados, usuários e configurações do MySQL</p>
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
        <p>Carregando informações do MySQL...</p>
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
                <span class="status-value">{{mysqlStatus?.version || 'N/A'}}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Uptime:</span>
                <span class="status-value">{{mysqlStatus?.uptime || 'N/A'}}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Conexões Ativas:</span>
                <span class="status-value">{{mysqlStatus?.connections || 0}}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Total de Queries:</span>
                <span class="status-value">{{mysqlStatus?.queries || 0}}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Diretório de Dados:</span>
                <span class="status-value">{{mysqlStatus?.dataDir || 'N/A'}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Databases -->
        <div class="panel databases-panel">
          <div class="panel-header">
            <h2>🗃️ Bancos de Dados</h2>
            <button class="add-btn" (click)="showCreateDatabase = true">
              <i class="fas fa-plus"></i>
              Novo DB
            </button>
          </div>
          <div class="panel-content">
            <div class="databases-list">
              <div *ngFor="let db of databases" class="database-item">
                <div class="database-info">
                  <span class="database-name">{{db.name}}</span>
                  <div class="database-meta">
                    <span>{{db.tables}} tabelas</span>
                    <span>{{db.size}}</span>
                    <span>{{db.created}}</span>
                  </div>
                </div>
                <div class="database-actions">
                  <button class="btn-icon" title="Exportar">
                    <i class="fas fa-download"></i>
                  </button>
                  <button class="btn-icon" title="Importar">
                    <i class="fas fa-upload"></i>
                  </button>
                  <button class="btn-icon danger" title="Excluir" (click)="deleteDatabase(db.name)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Create Database Form -->
            <div *ngIf="showCreateDatabase" class="create-form">
              <h3>Criar Novo Banco de Dados</h3>
              <div class="form-group">
                <label>Nome do Banco:</label>
                <input type="text" [(ngModel)]="newDatabase.name" placeholder="nome_do_banco">
              </div>
              <div class="form-group">
                <label>Charset:</label>
                <select [(ngModel)]="newDatabase.charset">
                  <option value="utf8mb4">utf8mb4</option>
                  <option value="utf8">utf8</option>
                  <option value="latin1">latin1</option>
                </select>
              </div>
              <div class="form-actions">
                <button class="btn create-btn" (click)="createDatabase()">Criar</button>
                <button class="btn cancel-btn" (click)="cancelCreateDatabase()">Cancelar</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Users -->
        <div class="panel users-panel">
          <div class="panel-header">
            <h2>👥 Usuários MySQL</h2>
            <button class="add-btn" (click)="showCreateUser = true">
              <i class="fas fa-plus"></i>
              Novo Usuário
            </button>
          </div>
          <div class="panel-content">
            <div class="users-list">
              <div *ngFor="let user of users" class="user-item">
                <div class="user-info">
                  <span class="user-name">{{user.username + '@' + user.host}}</span>
                  <div class="user-privileges">
                    <span *ngFor="let privilege of user.privileges" class="privilege-tag">
                      {{privilege}}
                    </span>
                  </div>
                  <span class="user-created">Criado: {{user.created}}</span>
                </div>
                <div class="user-actions">
                  <button class="btn-icon" title="Editar Privilégios">
                    <i class="fas fa-key"></i>
                  </button>
                  <button class="btn-icon danger" title="Excluir" (click)="deleteUser(user.username, user.host)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Create User Form -->
            <div *ngIf="showCreateUser" class="create-form">
              <h3>Criar Novo Usuário</h3>
              <div class="form-group">
                <label>Nome de Usuário:</label>
                <input type="text" [(ngModel)]="newUser.username" placeholder="usuario">
              </div>
              <div class="form-group">
                <label>Host:</label>
                <input type="text" [(ngModel)]="newUser.host" placeholder="%" value="%">
              </div>
              <div class="form-group">
                <label>Senha:</label>
                <input type="password" [(ngModel)]="newUser.password" placeholder="senha">
              </div>
              <div class="form-group">
                <label>Privilégios:</label>
                <div class="privileges-checkboxes">
                  <label *ngFor="let privilege of availablePrivileges" class="checkbox-label">
                    <input type="checkbox" 
                           [checked]="newUser.privileges.includes(privilege)"
                           (change)="togglePrivilege(privilege)">
                    {{privilege}}
                  </label>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn create-btn" (click)="createUser()">Criar</button>
                <button class="btn cancel-btn" (click)="cancelCreateUser()">Cancelar</button>
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
              <button class="action-card" (click)="openPhpMyAdmin()">
                <i class="fas fa-database"></i>
                <span>phpMyAdmin</span>
              </button>
              
              <button class="action-card" (click)="startService()" *ngIf="!isOnline">
                <i class="fas fa-play"></i>
                <span>Iniciar MySQL</span>
              </button>
              
              <button class="action-card" (click)="stopService()" *ngIf="isOnline">
                <i class="fas fa-stop"></i>
                <span>Parar MySQL</span>
              </button>
              
              <button class="action-card" (click)="restartService()">
                <i class="fas fa-redo"></i>
                <span>Reiniciar</span>
              </button>
              
              <button class="action-card" (click)="viewLogs()">
                <i class="fas fa-file-alt"></i>
                <span>Ver Logs</span>
              </button>
              
              <button class="action-card" (click)="backupAll()">
                <i class="fas fa-save"></i>
                <span>Backup Geral</span>
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
  styleUrls: ['./mysql.component.scss']
})
export class MysqlComponent implements OnInit {
  loading = true;
  isOnline = true;
  
  showCreateDatabase = false;
  showCreateUser = false;
  
  mysqlStatus: MySQLStatus | null = null;
  databases: MySQLDatabase[] = [];
  users: MySQLUser[] = [];
  
  newDatabase = { name: '', charset: 'utf8mb4' };
  newUser = { username: '', host: '%', password: '', privileges: [] as string[] };
  
  availablePrivileges = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 
    'REFERENCES', 'INDEX', 'ALTER', 'CREATE TEMPORARY TABLES',
    'LOCK TABLES', 'EXECUTE', 'CREATE VIEW', 'SHOW VIEW',
    'CREATE ROUTINE', 'ALTER ROUTINE', 'EVENT', 'TRIGGER'
  ];

  message: { type: 'success' | 'error' | 'info'; text: string } | null = null;

  constructor(private router: Router, private databaseService: DatabaseService) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadStatus(),
        this.loadDatabases(),
        this.loadUsers()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do MySQL:', error);
      this.showMessage('error', 'Erro ao carregar informações do MySQL');
    } finally {
      this.loading = false;
    }
  }

  async loadStatus() {
    try {
      this.databaseService.getMySQLStatus().subscribe({
        next: (status) => {
          this.mysqlStatus = status;
          this.isOnline = status?.online || false;
        },
        error: (error) => {
          console.error('Erro ao carregar status:', error);
          this.isOnline = false;
          this.mysqlStatus = null;
        }
      });
    } catch (error) {
      console.error('Erro ao carregar status:', error);
      this.isOnline = false;
      this.mysqlStatus = null;
    }
  }

  async loadDatabases() {
    try {
      this.databaseService.getDatabases().subscribe({
        next: (databases) => {
          this.databases = databases || [];
        },
        error: (error) => {
          console.error('Erro ao carregar bancos:', error);
          this.databases = [];
        }
      });
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
      this.databases = [];
    }
  }

  async loadUsers() {
    try {
      this.databaseService.getUsers().subscribe({
        next: (users) => {
          this.users = users || [];
        },
        error: (error) => {
          console.error('Erro ao carregar usuários:', error);
          this.users = [];
        }
      });
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      this.users = [];
    }
  }

  createDatabase() {
    if (!this.newDatabase.name.trim()) {
      this.showMessage('error', 'Nome do banco é obrigatório');
      return;
    }

    this.databaseService.createDatabase(this.newDatabase).subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.cancelCreateDatabase();
        this.loadDatabases(); // Recarregar lista
      },
      error: (error) => {
        console.error('Erro ao criar banco:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao criar banco de dados');
      }
    });
  }

  cancelCreateDatabase() {
    this.showCreateDatabase = false;
    this.newDatabase = { name: '', charset: 'utf8mb4' };
  }

  deleteDatabase(name: string) {
    if (confirm(`Tem certeza que deseja excluir o banco ${name}?`)) {
      this.databaseService.deleteDatabase(name).subscribe({
        next: (response) => {
          this.showMessage('success', response.message);
          this.loadDatabases(); // Recarregar lista
        },
        error: (error) => {
          console.error('Erro ao excluir banco:', error);
          this.showMessage('error', error.error?.detail || 'Erro ao excluir banco de dados');
        }
      });
    }
  }

  createUser() {
    if (!this.newUser.username.trim() || !this.newUser.password.trim()) {
      this.showMessage('error', 'Nome de usuário e senha são obrigatórios');
      return;
    }

    this.databaseService.createUser(this.newUser).subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.cancelCreateUser();
        this.loadUsers(); // Recarregar lista
      },
      error: (error) => {
        console.error('Erro ao criar usuário:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao criar usuário');
      }
    });
  }

  cancelCreateUser() {
    this.showCreateUser = false;
    this.newUser = { username: '', host: '%', password: '', privileges: [] };
  }

  deleteUser(username: string, host: string) {
    if (confirm(`Tem certeza que deseja excluir o usuário ${username}@${host}?`)) {
      this.databaseService.deleteUser(username, host).subscribe({
        next: (response) => {
          this.showMessage('success', response.message);
          this.loadUsers(); // Recarregar lista
        },
        error: (error) => {
          console.error('Erro ao excluir usuário:', error);
          this.showMessage('error', error.error?.detail || 'Erro ao excluir usuário');
        }
      });
    }
  }

  togglePrivilege(privilege: string) {
    const index = this.newUser.privileges.indexOf(privilege);
    if (index > -1) {
      this.newUser.privileges.splice(index, 1);
    } else {
      this.newUser.privileges.push(privilege);
    }
  }

  openPhpMyAdmin() {
    this.showMessage('info', 'Abrindo phpMyAdmin...');
    // Implementar abertura do phpMyAdmin
  }

  startService() {
    this.databaseService.startService().subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.loadStatus(); // Atualizar status
      },
      error: (error) => {
        console.error('Erro ao iniciar serviço:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao iniciar serviço MySQL');
      }
    });
  }

  stopService() {
    this.databaseService.stopService().subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.loadStatus(); // Atualizar status
      },
      error: (error) => {
        console.error('Erro ao parar serviço:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao parar serviço MySQL');
      }
    });
  }

  restartService() {
    this.databaseService.restartService().subscribe({
      next: (response) => {
        this.showMessage('success', response.message);
        this.loadStatus(); // Atualizar status
      },
      error: (error) => {
        console.error('Erro ao reiniciar serviço:', error);
        this.showMessage('error', error.error?.detail || 'Erro ao reiniciar serviço MySQL');
      }
    });
  }

  viewLogs() {
    this.showMessage('info', 'Visualização de logs será implementada');
  }

  backupAll() {
    // Fazer backup de todos os bancos não-sistema
    const userDatabases = this.databases.filter(db => 
      !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db.name)
    );

    if (userDatabases.length === 0) {
      this.showMessage('info', 'Nenhum banco de usuário para fazer backup');
      return;
    }

    this.showMessage('info', `Iniciando backup de ${userDatabases.length} banco(s)...`);
    
    // Fazer backup de cada banco
    userDatabases.forEach(db => {
      this.databaseService.backupDatabase(db.name).subscribe({
        next: (response) => {
          this.showMessage('success', response.message);
        },
        error: (error) => {
          console.error(`Erro no backup de ${db.name}:`, error);
          this.showMessage('error', `Erro no backup de ${db.name}: ${error.error?.detail || 'Erro desconhecido'}`);
        }
      });
    });
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
