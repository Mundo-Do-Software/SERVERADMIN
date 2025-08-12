import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface NetworkInterface {
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
  speed?: number;
  duplex?: string;
  mtu?: number;
}

export interface NetworkConnection {
  local_address: string;
  local_port: number;
  remote_address: string;
  remote_port: number;
  status: string;
  pid: number;
  process_name: string;
  protocol: 'tcp' | 'udp';
}

export interface FirewallRule {
  id: number;
  action: 'allow' | 'deny' | 'reject';
  direction: 'in' | 'out';
  protocol: string;
  port?: string;
  source?: string;
  destination?: string;
  interface?: string;
  enabled: boolean;
  description?: string;
}

export interface PingResult {
  host: string;
  packets_sent: number;
  packets_received: number;
  packet_loss: number;
  min_time: number;
  max_time: number;
  avg_time: number;
  success: boolean;
}

export interface PortScanResult {
  host: string;
  port: number;
  status: 'open' | 'closed' | 'filtered';
  service?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getNetworkInterfaces(): Observable<NetworkInterface[]> {
    return this.http.get<NetworkInterface[]>(`${this.apiUrl}/network/interfaces`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getNetworkConnections(): Observable<NetworkConnection[]> {
    return this.http.get<NetworkConnection[]>(`${this.apiUrl}/network/connections`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getListeningPorts(): Observable<NetworkConnection[]> {
    return this.http.get<NetworkConnection[]>(`${this.apiUrl}/network/listening`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getRoutingTable(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/network/routes`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  ping(host: string, count: number = 4): Observable<PingResult> {
    const params = { host, count: count.toString() };
    return this.http.get<PingResult>(`${this.apiUrl}/network/ping`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  scanPort(host: string, port: number): Observable<PortScanResult> {
    const params = { host, port: port.toString() };
    return this.http.get<PortScanResult>(`${this.apiUrl}/network/scan-port`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  scanPorts(host: string, startPort: number, endPort: number): Observable<PortScanResult[]> {
    const params = { 
      host, 
      start_port: startPort.toString(), 
      end_port: endPort.toString() 
    };
    return this.http.get<PortScanResult[]>(`${this.apiUrl}/network/scan-ports`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  getFirewallStatus(): Observable<{ enabled: boolean; default_policy: string }> {
    return this.http.get<{ enabled: boolean; default_policy: string }>(`${this.apiUrl}/network/firewall/status`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getFirewallRules(): Observable<FirewallRule[]> {
    return this.http.get<FirewallRule[]>(`${this.apiUrl}/network/firewall/rules`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  addFirewallRule(rule: Partial<FirewallRule>): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/network/firewall/rules`, rule)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateFirewallRule(id: number, rule: Partial<FirewallRule>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/network/firewall/rules/${id}`, rule)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteFirewallRule(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/network/firewall/rules/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  enableFirewall(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/network/firewall/enable`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  disableFirewall(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/network/firewall/disable`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  resetFirewall(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/network/firewall/reset`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  getNetworkStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/network/statistics`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getDNSSettings(): Observable<{ nameservers: string[]; domain?: string; search?: string[] }> {
    return this.http.get<{ nameservers: string[]; domain?: string; search?: string[] }>(`${this.apiUrl}/network/dns`)
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
    
    console.error('NetworkService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
