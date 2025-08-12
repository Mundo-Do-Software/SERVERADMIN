import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User, Group, CreateUserRequest, UpdateUserRequest } from '../../core/services/user.service';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  groups: Group[] = [];
  isLoading = true;
  error: string | null = null;
  
  // Modal states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  selectedUser: User | null = null;
  
  // Password confirmation fields
  confirmPassword = '';
  confirmEditPassword = '';
  
  // Form data
  createForm: CreateUserRequest = {
    username: '',
    password: '',
    groups: [],
    create_home: true,
    shell: '/bin/bash'
  };
  
  editForm: UpdateUserRequest = {};

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.loadUsers();
    this.loadGroups();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.error = null;
    
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.error = error.message;
        this.isLoading = false;
      }
    });
  }

  loadGroups(): void {
    this.userService.getGroups().subscribe({
      next: (data) => {
        this.groups = data;
      },
      error: (error) => {
        console.error('Error loading groups:', error);
      }
    });
  }

  openCreateModal(): void {
    this.createForm = {
      username: '',
      password: '',
      groups: [],
      create_home: true,
      shell: '/bin/bash'
    };
    this.confirmPassword = '';
    this.showCreateModal = true;
  }

  openEditModal(user: User): void {
    this.selectedUser = user;
    this.editForm = {
      groups: [...user.groups],
      shell: user.shell || '/bin/bash',
      password: '' // Always start empty for security
    };
    this.confirmEditPassword = '';
    this.showEditModal = true;
  }

  openDeleteModal(user: User): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedUser = null;
    this.confirmPassword = '';
    this.confirmEditPassword = '';
  }

  createUser(): void {
    if (!this.createForm.username || !this.createForm.password) {
      this.error = 'Nome de usuário e senha são obrigatórios';
      return;
    }

    this.userService.createUser(this.createForm).subscribe({
      next: (response) => {
        console.log('User created successfully:', response);
        this.loadUsers();
        this.closeModals();
        this.error = null;
      },
      error: (error) => {
        console.error('Error creating user:', error);
        this.error = error.message || 'Erro ao criar usuário';
      }
    });
  }

  updateUser(): void {
    if (!this.selectedUser) {
      this.error = 'Nenhum usuário selecionado';
      return;
    }

    this.userService.updateUser(this.selectedUser.username, this.editForm).subscribe({
      next: (response) => {
        console.log('User updated successfully:', response);
        this.loadUsers();
        this.closeModals();
        this.error = null;
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.error = error.message || 'Erro ao atualizar usuário';
      }
    });
  }

  deleteUser(): void {
    if (!this.selectedUser) {
      this.error = 'Nenhum usuário selecionado';
      return;
    }

    this.userService.deleteUser(this.selectedUser.username).subscribe({
      next: (response) => {
        console.log('User deleted successfully:', response);
        this.loadUsers();
        this.closeModals();
        this.error = null;
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.error = error.message || 'Erro ao deletar usuário';
      }
    });
  }

  lockUser(username: string): void {
    this.userService.lockUser(username).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error locking user:', error);
        this.error = error.message;
      }
    });
  }

  unlockUser(username: string): void {
    this.userService.unlockUser(username).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error unlocking user:', error);
        this.error = error.message;
      }
    });
  }

  onGroupChange(event: any, groupName: string, isCreate: boolean = false): void {
    const target = isCreate ? this.createForm : this.editForm;
    if (!target.groups) target.groups = [];

    if (event.target.checked) {
      if (!target.groups.includes(groupName)) {
        target.groups.push(groupName);
      }
    } else {
      target.groups = target.groups.filter(g => g !== groupName);
    }
  }

  isGroupSelected(groupName: string, isCreate: boolean = false): boolean {
    const target = isCreate ? this.createForm : this.editForm;
    return target.groups?.includes(groupName) || false;
  }

  getStatusClass(user: User): string {
    return user.is_active ? 'status-active' : 'status-inactive';
  }

  getStatusText(user: User): string {
    return user.is_active ? 'Ativo' : 'Inativo';
  }
}
