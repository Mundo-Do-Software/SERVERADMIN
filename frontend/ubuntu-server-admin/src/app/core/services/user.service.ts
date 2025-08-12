import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface User {
  username: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
  groups: string[];
  is_active: boolean;
  last_login?: string;
  password_expires?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  groups?: string[];
  home?: string;
  shell?: string;
  create_home?: boolean;
}

export interface UpdateUserRequest {
  password?: string;
  groups?: string[];
  shell?: string;
  is_active?: boolean;
}

export interface Group {
  name: string;
  gid: number;
  members: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getUser(username: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${username}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  createUser(userData: CreateUserRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateUser(username: string, userData: UpdateUserRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/users/${username}`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteUser(username: string, removeHome: boolean = false): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${username}?remove_home=${removeHome}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/users/groups`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  addUserToGroup(username: string, groupName: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/${username}/groups/${groupName}`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  removeUserFromGroup(username: string, groupName: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${username}/groups/${groupName}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  lockUser(username: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/${username}/lock`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  unlockUser(username: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/${username}/unlock`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Erro desconhecido!';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'Não foi possível conectar ao servidor.';
          break;
        case 400:
          errorMessage = 'Dados inválidos.';
          break;
        case 401:
          errorMessage = 'Não autorizado.';
          break;
        case 403:
          errorMessage = 'Acesso negado.';
          break;
        case 404:
          errorMessage = 'Usuário não encontrado.';
          break;
        case 409:
          errorMessage = 'Usuário já existe.';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor.';
          break;
        default:
          errorMessage = `Erro ${error.status}: ${error.message}`;
      }
    }
    
    console.error('UserService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
