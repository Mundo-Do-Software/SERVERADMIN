import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface MySQLStatus {
  online: boolean;
  version: string | null;
  uptime: string | null;
  connections: number;
  queries: number;
  dataDir: string | null;
}

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

interface CreateDatabaseRequest {
  name: string;
  charset?: string;
}

interface CreateUserRequest {
  username: string;
  host?: string;
  password: string;
  privileges?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = `${environment.apiUrl}/database`;

  constructor(private http: HttpClient) {}

  // Status do MySQL
  getMySQLStatus(): Observable<MySQLStatus> {
    return this.http.get<MySQLStatus>(`${this.apiUrl}/mysql/status`);
  }

  // Bancos de dados
  getDatabases(): Observable<MySQLDatabase[]> {
    return this.http.get<MySQLDatabase[]>(`${this.apiUrl}/mysql/databases`);
  }

  createDatabase(database: CreateDatabaseRequest): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/mysql/databases`, database);
  }

  deleteDatabase(name: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/mysql/databases/${name}`);
  }

  // Usuários
  getUsers(): Observable<MySQLUser[]> {
    return this.http.get<MySQLUser[]>(`${this.apiUrl}/mysql/users`);
  }

  createUser(user: CreateUserRequest): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/mysql/users`, user);
  }

  deleteUser(username: string, host: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/mysql/users/${username}/${host}`);
  }

  // Controle do serviço
  startService(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/mysql/service/start`, {});
  }

  stopService(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/mysql/service/stop`, {});
  }

  restartService(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/mysql/service/restart`, {});
  }

  // Backup
  backupDatabase(database: string): Observable<{message: string, file: string}> {
    return this.http.get<{message: string, file: string}>(`${this.apiUrl}/mysql/backup/${database}`);
  }
}
