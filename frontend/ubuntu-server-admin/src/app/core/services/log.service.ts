import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LogEntry {
  timestamp: string;
  level: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';
  service: string;
  message: string;
  pid?: number;
  hostname?: string;
  facility?: string;
}

export interface LogFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  lines: number;
  readable: boolean;
}

export interface SystemdJournalEntry {
  timestamp: string;
  unit: string;
  priority: number;
  message: string;
  pid?: number;
  uid?: number;
  gid?: number;
  comm?: string;
  exe?: string;
  hostname?: string;
}

export interface LogSearchParams {
  query?: string;
  level?: string;
  service?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface LogStatistics {
  total_entries: number;
  entries_by_level: Record<string, number>;
  entries_by_service: Record<string, number>;
  date_range: {
    start: string;
    end: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LogService {
  // Use the versioned API root (e.g., '/api/v1')
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSystemLogs(params?: LogSearchParams): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.apiUrl}/logs/system`, { params: params as any })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getAuthLogs(params?: LogSearchParams): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.apiUrl}/logs/auth`, { params: params as any })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getKernelLogs(params?: LogSearchParams): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.apiUrl}/logs/kernel`, { params: params as any })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getApacheLogs(params?: LogSearchParams): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.apiUrl}/logs/apache`, { params: params as any })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getNginxLogs(params?: LogSearchParams): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.apiUrl}/logs/nginx`, { params: params as any })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getDockerLogs(containerId?: string, params?: LogSearchParams): Observable<LogEntry[]> {
    const url = containerId 
      ? `${this.apiUrl}/logs/docker/${containerId}`
      : `${this.apiUrl}/logs/docker`;
    
    return this.http.get<LogEntry[]>(url, { params: params as any })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getJournalLogs(unit?: string, params?: LogSearchParams): Observable<SystemdJournalEntry[]> {
    const url = unit 
      ? `${this.apiUrl}/logs/journal/${unit}`
      : `${this.apiUrl}/logs/journal`;
    
    return this.http.get<SystemdJournalEntry[]>(url, { params: params as any })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getLogFiles(): Observable<LogFile[]> {
    return this.http.get<LogFile[]>(`${this.apiUrl}/logs/files`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getLogFile(path: string, lines?: number): Observable<{ content: string; lines: number }> {
    const params: any = { path };
    if (lines) {
      params.lines = lines.toString();
    }
    return this.http.get<{ content: string; lines: number }>(`${this.apiUrl}/logs/file`, { 
      params 
    })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  tailLogFile(path: string, lines: number = 100): Observable<{ content: string }> {
    const params = { path, lines: lines.toString() };
    return this.http.get<{ content: string }>(`${this.apiUrl}/logs/tail`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  searchLogs(params: LogSearchParams): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.apiUrl}/logs/search`, { params: params as any })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getLogStatistics(service?: string, start_date?: string, end_date?: string): Observable<LogStatistics> {
    const params: any = {};
    if (service) params.service = service;
    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;

    return this.http.get<LogStatistics>(`${this.apiUrl}/logs/statistics`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  exportLogs(params: LogSearchParams, format: 'csv' | 'json' | 'txt' = 'csv'): Observable<Blob> {
    const exportParams = { ...params, format };
    return this.http.get(`${this.apiUrl}/logs/export`, { 
      params: exportParams as any,
      responseType: 'blob'
    })
      .pipe(
        catchError(this.handleError)
      );
  }

  clearLogs(logType: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/logs/${logType}/clear`)
      .pipe(
        catchError(this.handleError)
      );
  }

  rotateLogs(logType: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logs/${logType}/rotate`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  getLogRotationConfig(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/logs/rotation/config`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  updateLogRotationConfig(config: any): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/logs/rotation/config`, config)
      .pipe(
        catchError(this.handleError)
      );
  }

  getActiveLogFiles(): Observable<LogFile[]> {
    return this.http.get<LogFile[]>(`${this.apiUrl}/logs/active`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  monitorLogFile(path: string): Observable<{ content: string; timestamp: string }> {
    return this.http.get<{ content: string; timestamp: string }>(`${this.apiUrl}/logs/monitor`, {
      params: { path }
    })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getSystemdUnits(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/logs/systemd/units`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getLogLevels(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/logs/levels`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getLogServices(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/logs/services`)
      .pipe(
        retry(2),
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
          errorMessage = 'Recurso não encontrado.';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor.';
          break;
        case 502:
          errorMessage = 'Erro de gateway.';
          break;
        case 503:
          errorMessage = 'Serviço indisponível.';
          break;
        default:
          errorMessage = `Erro ${error.status}: ${error.message}`;
      }
    }
    
    console.error('LogService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
