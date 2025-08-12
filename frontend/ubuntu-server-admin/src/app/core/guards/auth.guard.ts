import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.hasSudoPrivileges()) {
    return true;
  }

  // Redireciona para login se não estiver autenticado
  router.navigate(['/login']);
  return false;
};

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.hasSudoPrivileges()) {
    // Se já está autenticado, redireciona para dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
