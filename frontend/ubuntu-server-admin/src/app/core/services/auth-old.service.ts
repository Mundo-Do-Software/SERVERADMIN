import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    username: string;
    sudo: boolean;
    groups: string[];
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private tokenKey = 'serveradmin_token';
  private userKey = 'serveradmin_user';
  
  private baseUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
    }
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem(this.tokenKey);
    const user = localStorage.getItem(this.userKey);
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        this.currentUserSubject.next(userData);
      } catch (error) {
        this.logout();
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, {
      username: credentials.username,
      password: credentials.password,
      require_sudo: true
    }).pipe(
      tap(response => {
        if (response.success && response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return of({
          success: false,
          message: 'Erro ao autenticar. Verifique suas credenciais.'
        });
      })
    );
  }

  private setSession(token: string, user: any): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.userKey, JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.currentUserSubject.value;
    return !!(token && user && user.sudo);
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  // Método para verificar se o usuário tem privilégios sudo
  hasSudoPrivileges(): boolean {
    const user = this.getCurrentUser();
    return user && user.sudo === true;
  }

  // Método para validar credenciais sudo
  validateSudoCredentials(username: string, password: string): Observable<boolean> {
    return this.http.post<{ valid: boolean }>(`${this.baseUrl}/auth/validate-sudo`, {
      username,
      password
    }).pipe(
      map(response => response.valid),
      catchError(() => of(false))
    );
  }
}
