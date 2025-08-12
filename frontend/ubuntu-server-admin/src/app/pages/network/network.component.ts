import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { 
  NetworkService, 
  NetworkInterface, 
  NetworkStats, 
  DNSServer, 
  NetworkConnection, 
  PingResult 
} from '../../services/network.service';

@Component({
  selector: 'app-network',
  imports: [CommonModule, FormsModule],
  templateUrl: './network.component.html',
  styleUrl: './network.component.scss'
})
export class NetworkComponent implements OnInit, OnDestroy {
  
  // Data properties
  interfaces: NetworkInterface[] = [];
  stats: NetworkStats | null = null;
  dnsServers: DNSServer[] = [];
  connections: NetworkConnection[] = [];
  
  // UI state
  loading = true;
  error: string | null = null;
  refreshing = false;
  pingHost = '';
  pingResult: PingResult | null = null;
  pinging = false;
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  private autoRefreshSubscription?: Subscription;
  
  constructor(private networkService: NetworkService) {}
  
  ngOnInit(): void {
    this.loadAllData();
    this.setupAutoRefresh();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
  }
  
  loadAllData(): void {
    this.loading = true;
    this.error = null;
    
    // Load interfaces
    const interfacesSub = this.networkService.getInterfaces().subscribe({
      next: (response) => {
        this.interfaces = response.interfaces;
      },
      error: (error) => {
        console.error('Erro ao carregar interfaces:', error);
        this.error = 'Erro ao carregar interfaces de rede';
      }
    });
    this.subscriptions.push(interfacesSub);
    
    // Load stats
    const statsSub = this.networkService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Erro ao carregar estatísticas:', error);
      }
    });
    this.subscriptions.push(statsSub);
    
    // Load DNS
    const dnsSub = this.networkService.getDNSServers().subscribe({
      next: (response) => {
        this.dnsServers = response.dns_servers;
      },
      error: (error) => {
        console.error('Erro ao carregar DNS:', error);
      }
    });
    this.subscriptions.push(dnsSub);
    
    // Load connections
    const connectionsSub = this.networkService.getConnections().subscribe({
      next: (response) => {
        this.connections = response.connections;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar conexões:', error);
        this.loading = false;
      }
    });
    this.subscriptions.push(connectionsSub);
  }
  
  private setupAutoRefresh(): void {
    // Auto refresh every 30 seconds
    this.autoRefreshSubscription = timer(30000, 30000).subscribe(() => {
      if (!this.refreshing) {
        this.refreshStats();
        this.refreshConnections();
      }
    });
  }
  
  // Refresh methods
  refreshAll(): void {
    this.refreshing = true;
    this.loadAllData();
    setTimeout(() => {
      this.refreshing = false;
    }, 1000);
  }
  
  refreshInterfaces(): void {
    this.networkService.refreshInterfaces();
  }
  
  refreshStats(): void {
    this.networkService.refreshStats();
  }
  
  refreshConnections(): void {
    this.networkService.refreshConnections();
  }
  
  // Interface operations
  toggleInterface(interfaceName: string): void {
    const interfaceToToggle = this.interfaces.find(i => i.name === interfaceName);
    if (!interfaceToToggle) return;
    
    const action = interfaceToToggle.status === 'online' ? 'desabilitar' : 'habilitar';
    
    if (confirm(`Deseja ${action} a interface ${interfaceName}?`)) {
      const toggleSub = this.networkService.toggleInterface(interfaceName).subscribe({
        next: (response) => {
          alert(response.message);
          this.refreshInterfaces();
        },
        error: (error) => {
          console.error('Erro ao alterar interface:', error);
          alert('Erro ao alterar interface. Verifique as permissões.');
        }
      });
      this.subscriptions.push(toggleSub);
    }
  }
  
  // Network operations
  restartNetwork(): void {
    if (confirm('Deseja reiniciar os serviços de rede? Isso pode interromper conexões ativas.')) {
      const restartSub = this.networkService.restartNetwork().subscribe({
        next: (response) => {
          alert(response.message);
          setTimeout(() => {
            this.refreshAll();
          }, 3000);
        },
        error: (error) => {
          console.error('Erro ao reiniciar rede:', error);
          alert('Erro ao reiniciar rede. Verifique as permissões.');
        }
      });
      this.subscriptions.push(restartSub);
    }
  }
  
  // Ping operation
  executePing(): void {
    if (!this.pingHost.trim()) {
      alert('Por favor, digite um host para fazer ping');
      return;
    }
    
    this.pinging = true;
    this.pingResult = null;
    
    const pingSub = this.networkService.pingHost(this.pingHost.trim()).subscribe({
      next: (result) => {
        this.pingResult = result;
        this.pinging = false;
      },
      error: (error) => {
        console.error('Erro ao executar ping:', error);
        this.pingResult = {
          host: this.pingHost,
          reachable: false,
          packet_loss: '100%',
          avg_time: 'N/A',
          error: 'Erro na execução'
        };
        this.pinging = false;
      }
    });
    this.subscriptions.push(pingSub);
  }
  
  // Utility methods
  getInterfaceIcon(type: string): string {
    return this.networkService.getInterfaceIcon(type);
  }
  
  getStatusClass(status: string): string {
    return this.networkService.getStatusClass(status);
  }
  
  formatBytes(bytes: number): string {
    return this.networkService.formatBytes(bytes);
  }
  
  formatSpeed(speed: number | null): string {
    return this.networkService.formatSpeed(speed);
  }
  
  getConnectionDuration(connection: NetworkConnection): string {
    // Simular duração baseada no PID (mock)
    const hours = Math.floor(connection.pid / 1000) % 24;
    const minutes = Math.floor(connection.pid / 10) % 60;
    return `${hours}h ${minutes}m`;
  }
  
  getProcessIcon(processName: string): string {
    const icons: {[key: string]: string} = {
      'nginx': 'fas fa-server',
      'apache': 'fas fa-server',
      'docker': 'fab fa-docker',
      'ssh': 'fas fa-terminal',
      'chrome': 'fab fa-chrome',
      'firefox': 'fab fa-firefox',
      'node': 'fab fa-node-js'
    };
    
    const name = processName.toLowerCase();
    for (const [process, icon] of Object.entries(icons)) {
      if (name.includes(process)) {
        return icon;
      }
    }
    
    return 'fas fa-cog';
  }
}
