import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserInfo;
  message?: string;
}

export interface UserInfo {
  username: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
  groups: string[];
  sudo: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  require_sudo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api/v1';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);

  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('auth_token');
      const userInfo = localStorage.getItem('user_info');
      
      if (token && userInfo) {
        try {
          const user = JSON.parse(userInfo);
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          
          // Verifica se o token ainda é válido
          this.verifyToken().subscribe({
            error: () => this.logout()
          });
        } catch (error) {
          this.logout();
        }
      }
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const loginData = {
      ...credentials,
      require_sudo: credentials.require_sudo ?? true
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, loginData)
      .pipe(
        tap(response => {
          if (response.success && response.token && response.user) {
            this.setAuthData(response.token, response.user);
          }
        }),
        catchError(error => {
          console.error('Login error:', error);
          return of({
            success: false,
            message: 'Erro de conexão com o servidor'
          });
        })
      );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    }
    
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);

    // Chama o endpoint de logout no backend
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe();
  }

  private setAuthData(token: string, user: UserInfo): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_info', JSON.stringify(user));
    }
    
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next(user);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  hasSudoPrivileges(): boolean {
    const user = this.getCurrentUser();
    return user?.sudo ?? false;
  }

  validateSudo(username: string, password: string): Observable<boolean> {
    return this.http.post<{valid: boolean}>(`${this.apiUrl}/auth/validate-sudo`, {
      username,
      password
    }).pipe(
      map(response => response.valid),
      catchError(() => of(false))
    );
  }

  verifyToken(): Observable<{valid: boolean; user: string}> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<{valid: boolean; user: string}>(`${this.apiUrl}/auth/verify`, { headers });
  }

  getCurrentUserInfo(): Observable<UserInfo> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<UserInfo>(`${this.apiUrl}/auth/me`, { headers });
  }
}
