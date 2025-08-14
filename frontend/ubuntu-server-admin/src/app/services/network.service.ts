import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NetworkInterface {
  name: string;
  type: string;
  status: string;
  ip_address: string | null;
  netmask: string | null;
  mac_address: string | null;
  speed: number | null;
  rx_bytes: number;
  tx_bytes: number;
  is_up: boolean;
  mtu: number;
}

export interface NetworkInterfacesResponse {
  interfaces: NetworkInterface[];
  total_interfaces: number;
  online_interfaces: number;
}

export interface NetworkStats {
  download: string;
  upload: string;
  download_bytes: number;
  upload_bytes: number;
  packets_sent: number;
  packets_recv: number;
  errors: number;
  drops: number;
}

export interface DNSServer {
  ip: string;
  type: string;
}

export interface DNSResponse {
  dns_servers: DNSServer[];
  total_servers: number;
}

export interface NetworkConnection {
  local_address: string;
  remote_address: string;
  process_name: string;
  pid: number;
  status: string;
  protocol: string;
}

export interface ConnectionsResponse {
  connections: NetworkConnection[];
  total_connections: number;
}

export interface PingResult {
  host: string;
  reachable: boolean;
  packet_loss: string;
  avg_time: string;
  output?: string;
  error?: string;
}

export interface InterfaceToggleResponse {
  message: string;
  interface: string;
  action: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private readonly apiUrl = `${environment.apiUrl}/network`;
  
  private interfacesSubject = new BehaviorSubject<NetworkInterface[]>([]);
  public interfaces$ = this.interfacesSubject.asObservable();
  
  private statsSubject = new BehaviorSubject<NetworkStats | null>(null);
  public stats$ = this.statsSubject.asObservable();
  
  private connectionsSubject = new BehaviorSubject<NetworkConnection[]>([]);
  public connections$ = this.connectionsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  private getAuthHeaders(): HttpHeaders {
  const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private loadInitialData(): void {
    this.getInterfaces().subscribe();
    this.getStats().subscribe();
    this.getConnections().subscribe();
  }

  // Interfaces de Rede
  getInterfaces(): Observable<NetworkInterfacesResponse> {
    return new Observable(observer => {
      this.http.get<NetworkInterfacesResponse>(`${this.apiUrl}/interfaces`, {
        headers: this.getAuthHeaders()
      }).subscribe({
        next: (response) => {
          this.interfacesSubject.next(response.interfaces);
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          console.error('Erro ao obter interfaces:', error);
          observer.error(error);
        }
      });
    });
  }

  // Estatísticas de Rede
  getStats(): Observable<NetworkStats> {
    return new Observable(observer => {
      this.http.get<NetworkStats>(`${this.apiUrl}/stats`, {
        headers: this.getAuthHeaders()
      }).subscribe({
        next: (stats) => {
          this.statsSubject.next(stats);
          observer.next(stats);
          observer.complete();
        },
        error: (error) => {
          console.error('Erro ao obter estatísticas:', error);
          observer.error(error);
        }
      });
    });
  }

  // Configuração DNS
  getDNSServers(): Observable<DNSResponse> {
    return this.http.get<DNSResponse>(`${this.apiUrl}/dns`, {
      headers: this.getAuthHeaders()
    });
  }

  // Conexões Ativas
  getConnections(): Observable<ConnectionsResponse> {
    return new Observable(observer => {
      this.http.get<ConnectionsResponse>(`${this.apiUrl}/connections`, {
        headers: this.getAuthHeaders()
      }).subscribe({
        next: (response) => {
          this.connectionsSubject.next(response.connections);
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          console.error('Erro ao obter conexões:', error);
          observer.error(error);
        }
      });
    });
  }

  // Toggle Interface
  toggleInterface(interfaceName: string): Observable<InterfaceToggleResponse> {
    return this.http.post<InterfaceToggleResponse>(`${this.apiUrl}/interface/${interfaceName}/toggle`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Reiniciar Rede
  restartNetwork(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/restart`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Ping Host
  pingHost(host: string): Observable<PingResult> {
    return this.http.get<PingResult>(`${this.apiUrl}/ping/${host}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Refresh Data
  refreshInterfaces(): void {
    this.getInterfaces().subscribe();
  }

  refreshStats(): void {
    this.getStats().subscribe();
  }

  refreshConnections(): void {
    this.getConnections().subscribe();
  }

  refreshAll(): void {
    this.refreshInterfaces();
    this.refreshStats();
    this.refreshConnections();
  }

  // Formatação de dados
  formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(1)} ${sizes[i]}`;
  }

  formatSpeed(speed: number | null): string {
    if (!speed || speed <= 0) return 'N/A';
    
    if (speed >= 1000) {
      return `${(speed / 1000).toFixed(1)} Gbps`;
    }
    return `${speed} Mbps`;
  }

  getInterfaceIcon(type: string): string {
    const icons: {[key: string]: string} = {
      'Ethernet': 'fas fa-ethernet',
      'Wi-Fi': 'fas fa-wifi',
      'Loopback': 'fas fa-redo',
      'Docker': 'fab fa-docker',
      'Bridge': 'fas fa-bridge',
      'Tunnel': 'fas fa-route',
      'Other': 'fas fa-network-wired'
    };
    
    return icons[type] || 'fas fa-network-wired';
  }

  getStatusClass(status: string): string {
    return status === 'online' ? 'status-badge online' : 'status-badge offline';
  }

  getStatusIcon(status: string): string {
    return status === 'online' ? 'fas fa-check-circle' : 'fas fa-times-circle';
  }
}
