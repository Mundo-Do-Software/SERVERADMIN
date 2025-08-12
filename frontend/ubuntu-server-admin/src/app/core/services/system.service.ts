import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface GpuInfo {
  type: string;
  name: string;
  memory_total?: number | null;
  memory_used?: number | null;
  memory_free?: number | null;
  temperature?: number | null;
  utilization?: number | null;
}

export interface CpuInfo {
  cores_physical: number;
  cores_logical: number;
  frequency?: {
    current: number;
    min: number;
    max: number;
  };
  usage_percent: number;
}

export interface MemoryInfo {
  total: number;
  available: number;
  used: number;
  free: number;
  percent: number;
}

export interface DiskInfo {
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface SystemInfo {
  hostname: string;
  os_version: string;
  kernel_version: string;
  uptime: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  load_average: number[];
  boot_time: string;
  architecture: string;
  os_info?: string;
  temperature?: number;
  // Campos adicionais do backend
  system?: string;
  node?: string;
  release?: string;
  version?: string;
  machine?: string;
  processor?: string;
  gpu?: GpuInfo[];
  // Informações detalhadas
  cpu?: CpuInfo;
  memory?: MemoryInfo;
  disk?: DiskInfo;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
  status: string;
  username: string;
  command: string;
}

export interface DiskInfo {
  device: string;
  mountpoint: string;
  fstype: string;
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface SystemNetworkInterface {
  interface: string;
  ip_address: string;
  netmask: string;
  broadcast: string;
  mac_address: string;
  is_up: boolean;
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
}

@Injectable({
  providedIn: 'root'
})
export class SystemService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getSystemInfo(): Observable<SystemInfo> {
    return this.http.get<SystemInfo>(`${this.apiUrl}/system/info`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getProcesses(): Observable<ProcessInfo[]> {
    return this.http.get<ProcessInfo[]>(`${this.apiUrl}/system/processes`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getDiskUsage(): Observable<DiskInfo[]> {
    return this.http.get<DiskInfo[]>(`${this.apiUrl}/system/disks`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getNetworkInterfaces(): Observable<SystemNetworkInterface[]> {
    return this.http.get<SystemNetworkInterface[]>(`${this.apiUrl}/system/network`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getSystemLogs(lines: number = 100): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/system/logs?lines=${lines}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  rebootSystem(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/system/reboot`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  shutdownSystem(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/system/shutdown`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  updateSystem(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/system/update`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Erro desconhecido!';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
          break;
        case 404:
          errorMessage = 'Endpoint não encontrado.';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor.';
          break;
        default:
          errorMessage = `Erro ${error.status}: ${error.message}`;
      }
    }
    
    console.error('SystemService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
