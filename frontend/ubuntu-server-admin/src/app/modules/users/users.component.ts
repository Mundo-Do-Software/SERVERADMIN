import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface User {
  username: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
  groups: string[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="users-container">
      <div class="page-header">
        <h2>👥 Gerenciamento de Usuários</h2>
        <button class="btn btn-primary" (click)="showCreateUser = true">
          <i class="fas fa-plus"></i> Novo Usuário
        </button>
      </div>

      <!-- Create User Form -->
      <div class="card mb-20" *ngIf="showCreateUser">
        <div class="card-header">
          <h3>Criar Novo Usuário</h3>
          <button class="btn btn-secondary" (click)="showCreateUser = false">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
        <div class="card-body">
          <form (ngSubmit)="createUser()" #userForm="ngForm" class="grid grid-2">
            <div class="form-group">
              <label>Nome de Usuário:</label>
              <input type="text" class="form-control" [(ngModel)]="newUser.username" name="username" required>
            </div>
            <div class="form-group">
              <label>Senha:</label>
              <input type="password" class="form-control" [(ngModel)]="newUser.password" name="password" required>
            </div>
            <div class="form-group">
              <label>Confirmar Senha:</label>
              <input type="password" class="form-control" [(ngModel)]="newUser.confirmPassword" name="confirmPassword" required>
            </div>
            <div class="form-group">
              <label>Shell:</label>
              <select class="form-control" [(ngModel)]="newUser.shell" name="shell">
                <option value="/bin/bash">/bin/bash</option>
                <option value="/bin/sh">/bin/sh</option>
                <option value="/bin/zsh">/bin/zsh</option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" [(ngModel)]="newUser.createHome" name="createHome"> 
                Criar diretório home
              </label>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" [(ngModel)]="newUser.addToSudo" name="addToSudo"> 
                Adicionar ao grupo sudo
              </label>
            </div>
            <div style="grid-column: 1 / -1;">
              <button type="submit" class="btn btn-primary" [disabled]="!userForm.valid || isLoading">
                <span *ngIf="isLoading" class="loading"></span>
                Criar Usuário
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card">
        <div class="card-header">
          <h3>Usuários do Sistema</h3>
          <button class="btn btn-secondary" (click)="loadUsers()">
            <i class="fas fa-sync"></i> Atualizar
          </button>
        </div>
        <div class="card-body">
          <div *ngIf="isLoading" class="text-center">
            <div class="loading"></div>
            <p>Carregando usuários...</p>
          </div>
          
          <table class="table" *ngIf="!isLoading">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>UID</th>
                <th>GID</th>
                <th>Home</th>
                <th>Shell</th>
                <th>Grupos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users">
                <td>
                  <strong>{{ user.username }}</strong>
                  <span *ngIf="user.groups.includes('sudo')" class="status-badge status-warning">SUDO</span>
                </td>
                <td>{{ user.uid }}</td>
                <td>{{ user.gid }}</td>
                <td>{{ user.home }}</td>
                <td>{{ user.shell }}</td>
                <td>
                  <span *ngFor="let group of user.groups.slice(0, 3)" class="group-badge">
                    {{ group }}
                  </span>
                  <span *ngIf="user.groups.length > 3" class="more-groups">
                    +{{ user.groups.length - 3 }} mais
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-warning" (click)="changeUserPassword(user.username)">
                    <i class="fas fa-key"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" (click)="removeUser(user.username)" 
                          [disabled]="user.username === 'root' || user.uid < 1000">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div *ngIf="message" class="alert" [class.alert-success]="!isError" [class.alert-error]="isError">
        {{ message }}
      </div>
    </div>
  `,
  styles: [`
    .users-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.875rem;
      margin-right: 5px;
    }

    .group-badge {
      background: #e2e8f0;
      color: #4a5568;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      margin-right: 5px;
      display: inline-block;
    }

    .more-groups {
      color: #666;
      font-size: 0.75rem;
      font-style: italic;
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

    .btn-secondary {
      background: #e2e8f0;
      color: #4a5568;
    }

    .btn-secondary:hover {
      background: #cbd5e0;
    }
  `]
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  isLoading = false;
  showCreateUser = false;
  message = '';
  isError = false;

  newUser = {
    username: '',
    password: '',
    confirmPassword: '',
    shell: '/bin/bash',
    createHome: true,
    addToSudo: false
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    // Mock data for now
    setTimeout(() => {
      this.users = [
        {
          username: 'root',
          uid: 0,
          gid: 0,
          home: '/root',
          shell: '/bin/bash',
          groups: ['root']
        },
        {
          username: 'ubuntu',
          uid: 1000,
          gid: 1000,
          home: '/home/ubuntu',
          shell: '/bin/bash',
          groups: ['ubuntu', 'sudo', 'adm', 'dialout', 'cdrom']
        },
        {
          username: 'www-data',
          uid: 33,
          gid: 33,
          home: '/var/www',
          shell: '/usr/sbin/nologin',
          groups: ['www-data']
        }
      ];
      this.isLoading = false;
    }, 1000);
  }

  createUser() {
    if (this.newUser.password !== this.newUser.confirmPassword) {
      this.showMessage('As senhas não coincidem', true);
      return;
    }

    this.isLoading = true;
    // Simulate API call
    setTimeout(() => {
      this.showMessage('Usuário criado com sucesso!');
      this.showCreateUser = false;
      this.resetNewUser();
      this.loadUsers();
      this.isLoading = false;
    }, 1500);
  }

  changeUserPassword(username: string) {
    const newPassword = prompt(`Digite a nova senha para ${username}:`);
    if (newPassword) {
      this.showMessage(`Senha alterada para ${username}!`);
    }
  }

  removeUser(username: string) {
    if (!confirm(`Tem certeza que deseja deletar o usuário ${username}?`)) {
      return;
    }

    this.showMessage(`Usuário ${username} deletado com sucesso!`);
    this.loadUsers();
  }

  resetNewUser() {
    this.newUser = {
      username: '',
      password: '',
      confirmPassword: '',
      shell: '/bin/bash',
      createHome: true,
      addToSudo: false
    };
  }

  showMessage(msg: string, isError = false) {
    this.message = msg;
    this.isError = isError;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}
