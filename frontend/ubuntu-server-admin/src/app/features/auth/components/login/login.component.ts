import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  host: { 'class': 'login-host' }
})
export class LoginComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Output() login = new EventEmitter<{ username: string; password: string }>();

  form: FormGroup;
  showPassword = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }
    this.login.emit(this.form.value);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.form.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) {
        return `${fieldName === 'username' ? 'Usuário' : 'Senha'} é obrigatório`;
      }
      if (field.errors['minlength']) {
        const requiredLength = field.errors['minlength'].requiredLength;
        return `${fieldName === 'username' ? 'Usuário' : 'Senha'} deve ter pelo menos ${requiredLength} caracteres`;
      }
    }
    return null;
  }
}
