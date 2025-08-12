import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, LoginCredentials, AuthResponse } from '../../../core/services/auth.service';
import { LoginComponent } from '../components/login/login.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginComponent],
  template: `
    <app-login 
      [loading]="loading"
      [error]="errorMessage"
      (login)="handleLogin($event)">
    </app-login>
  `
})
export class LoginPageComponent {
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  handleLogin(credentials: LoginCredentials) {
    this.loading = true;
    this.errorMessage = null;
    
    this.auth.login(credentials).subscribe({
      next: (response: AuthResponse) => {
        this.loading = false;
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response.message || 'Credenciais inválidas ou usuário sem privilégios sudo';
        }
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Login error:', error);
        this.errorMessage = 'Erro ao conectar com o servidor. Tente novamente.';
      }
    });
  }
}
