import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ServiceInfo {
  name: string;
  load_state: string;
  active_state: string;
  sub_state: string;
  description: string;
  status: 'online' | 'offline' | 'warning';
  unit_file_state?: string;
  enabled?: boolean;
  pid?: number;
  memory_usage?: string;
  cpu_usage?: number;
  uptime?: string;
}

export interface ServiceAction {
  action: 'start' | 'stop' | 'restart' | 'reload' | 'enable' | 'disable';
  service: string;
}

export interface ServiceLog {
  timestamp: string;
  level: string;
  message: string;
  unit: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getServices(): Observable<ServiceInfo[]> {
    return this.http.get<{services: ServiceInfo[]}>(`${this.apiUrl}/services/`)
      .pipe(
        retry(2),
        catchError(this.handleError),
        map((response: {services: ServiceInfo[]}) => response.services)
      );
  }

  getService(serviceName: string): Observable<ServiceInfo> {
    return this.http.get<ServiceInfo>(`${this.apiUrl}/services/${serviceName}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getServiceStatus(serviceName: string): Observable<ServiceInfo> {
    return this.http.get<ServiceInfo>(`${this.apiUrl}/services/${serviceName}/status`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  startService(serviceName: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/services/${serviceName}/start`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  stopService(serviceName: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/services/${serviceName}/stop`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  restartService(serviceName: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/services/${serviceName}/restart`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  reloadService(serviceName: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/services/${serviceName}/reload`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  enableService(serviceName: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/services/${serviceName}/enable`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  disableService(serviceName: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/services/${serviceName}/disable`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  getServiceLogs(serviceName: string, lines: number = 100): Observable<ServiceLog[]> {
    return this.http.get<ServiceLog[]>(`${this.apiUrl}/services/${serviceName}/logs?lines=${lines}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getRunningServices(): Observable<ServiceInfo[]> {
    return this.http.get<ServiceInfo[]>(`${this.apiUrl}/services/running`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getFailedServices(): Observable<ServiceInfo[]> {
    return this.http.get<ServiceInfo[]>(`${this.apiUrl}/services/failed`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getEnabledServices(): Observable<ServiceInfo[]> {
    return this.http.get<ServiceInfo[]>(`${this.apiUrl}/services/enabled`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  searchServices(query: string): Observable<ServiceInfo[]> {
    return this.http.get<ServiceInfo[]>(`${this.apiUrl}/services/search?q=${encodeURIComponent(query)}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  reloadSystemd(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/services/reload-daemon`, {})
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
          errorMessage = 'Solicitação inválida.';
          break;
        case 401:
          errorMessage = 'Não autorizado.';
          break;
        case 403:
          errorMessage = 'Acesso negado.';
          break;
        case 404:
          errorMessage = 'Serviço não encontrado.';
          break;
        case 409:
          errorMessage = 'Conflito na operação.';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor.';
          break;
        default:
          errorMessage = `Erro ${error.status}: ${error.message}`;
      }
    }
    
    console.error('ServiceService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
