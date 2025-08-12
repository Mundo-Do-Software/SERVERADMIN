import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { SystemService, SystemInfo } from '../core/services/system.service';
import { ServiceService, ServiceInfo } from '../core/services/service.service';
import { SystemChartsComponent } from './system-charts.component';

@Component({
  selector: 'app-premium-dashboard',
  standalone: true,
  imports: [CommonModule, SystemChartsComponent],
  templateUrl: './premium-dashboard.component.html',
  styleUrls: ['./premium-dashboard.component.scss']
})
export class PremiumDashboardComponent implements OnInit, OnDestroy {
  systemInfo: SystemInfo | null = null;
  services: ServiceInfo[] = [];
  private subscription: Subscription = new Subscription();

  constructor(
    private systemService: SystemService,
    private serviceService: ServiceService
  ) {}

  ngOnInit() {
    this.loadSystemInfo();
    this.loadServices();
    
    // Update every 30 seconds
    this.subscription.add(
      interval(30000).subscribe(() => {
        this.loadSystemInfo();
        this.loadServices();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private loadSystemInfo() {
    this.systemService.getSystemInfo()
      .subscribe({
        next: (data: SystemInfo) => {
          this.systemInfo = data;
        },
        error: (error: any) => {
          console.error('Error loading system info:', error);
          // Provide fallback data for demo
          this.systemInfo = {
            hostname: 'ubuntu-server',
            os_version: 'Ubuntu 22.04.3 LTS',
            kernel_version: 'Linux 5.15.0-88-generic',
            uptime: '2 days, 14:32:15',
            cpu_usage: 25.4,
            memory_usage: 67.8,
            disk_usage: 45.2,
            load_average: [0.85, 0.92, 0.78],
            boot_time: '2024-01-15 09:30:00',
            architecture: 'x86_64',
            os_info: 'Ubuntu 22.04 LTS',
            temperature: 42
          };
        }
      });
  }

  private loadServices() {
    this.serviceService.getServices()
      .subscribe({
        next: (data: ServiceInfo[]) => {
          this.services = data.map((service: ServiceInfo) => ({
            ...service,
            status: this.mapServiceStatus(service.active_state, service.sub_state)
          }));
        },
        error: (error: any) => {
          console.error('Error loading services:', error);
          // Provide fallback data for demo
          this.services = [
            {
              name: 'nginx',
              load_state: 'loaded',
              active_state: 'active',
              sub_state: 'running',
              description: 'A high performance web server',
              status: 'online'
            },
            {
              name: 'ssh',
              load_state: 'loaded',
              active_state: 'active',
              sub_state: 'running',
              description: 'OpenBSD Secure Shell server',
              status: 'online'
            },
            {
              name: 'mysql',
              load_state: 'loaded',
              active_state: 'inactive',
              sub_state: 'dead',
              description: 'MySQL Community Server',
              status: 'offline'
            },
            {
              name: 'docker',
              load_state: 'loaded',
              active_state: 'active',
              sub_state: 'running',
              description: 'Docker Application Container Engine',
              status: 'online'
            }
          ];
        }
      });
  }

  private mapServiceStatus(activeState: string, subState: string): 'online' | 'offline' | 'warning' {
    if (activeState === 'active' && subState === 'running') {
      return 'online';
    } else if (activeState === 'inactive') {
      return 'offline';
    } else if (activeState === 'failed') {
      return 'offline';
    } else {
      return 'warning';
    }
  }
}
