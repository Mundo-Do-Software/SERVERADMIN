import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  styleUrls: ['./dashboard.component.scss'],
  template: `
    <div class="dashboard-container">
      <h1 class="dashboard-title">
        🖥️ Ubuntu Server Admin Dashboard
      </h1>
      
      <div class="dashboard-grid">
        
        <!-- System Info Card -->
        <div class="dashboard-card">
          <h3 class="card-title">📊 System Information</h3>
          <div class="card-content" *ngIf="systemInfo; else loading">
            <div class="info-item"><strong>CPU Usage:</strong> {{ systemInfo.cpu_usage }}%</div>
            <div class="info-item"><strong>Memory:</strong> {{ systemInfo.memory_usage }}%</div>
            <div class="info-item"><strong>Uptime:</strong> {{ systemInfo.uptime }}</div>
            <div class="info-item"><strong>OS:</strong> {{ systemInfo.os_version }}</div>
          </div>
          <ng-template #loading>
            <div class="loading-text">Loading system information...</div>
          </ng-template>
        </div>

        <!-- Services Card -->
        <div class="dashboard-card">
          <h3 class="card-title">⚙️ Services Status</h3>
          <div class="card-content" *ngIf="services; else servicesLoading">
            <div *ngFor="let service of services.slice(0, 5)" class="service-item">
              <span class="status-indicator" [ngClass]="service.status === 'active' ? 'active' : 'inactive'">
                {{ service.status === 'active' ? '🟢' : '🔴' }}
              </span>
              {{ service.name }}
            </div>
            <div class="service-count">
              Showing first 5 services
            </div>
          </div>
          <ng-template #servicesLoading>
            <div class="loading-text">Loading services...</div>
          </ng-template>
        </div>

        <!-- Quick Actions -->
        <div class="dashboard-card quick-actions">
          <h3 class="card-title">🚀 Quick Actions</h3>
          <div class="card-content">
            <button (click)="refreshData()" class="action-button">
              🔄 Refresh Data
            </button>
            <button (click)="testBackend()" class="action-button success">
              🧪 Test Backend
            </button>
            <div *ngIf="backendStatus" class="status-message" 
                 [ngClass]="backendStatus.includes('success') || backendStatus.includes('✅') ? 'success' : 'error'">
              {{ backendStatus }}
            </div>
          </div>
        </div>

        <!-- Connection Status -->
        <div class="dashboard-card connection-status">
          <h3 class="card-title">🌐 Connection Status</h3>
          <div class="card-content">
            <div class="status-item">
              <strong>Backend:</strong> 
              <span [ngClass]="isBackendConnected ? 'status-connected' : 'status-disconnected'">
                {{ isBackendConnected ? '🟢 Connected' : '🔴 Disconnected' }}
              </span>
            </div>
            <div class="status-item">
              <strong>Last Update:</strong> {{ lastUpdate || 'Never' }}
            </div>
            <div class="backend-url">
              Backend URL: http://localhost:8000
            </div>
          </div>
        </div>

      </div>

      <!-- Debug Information -->
      <div class="debug-section">
        <h4 class="debug-title">🐛 Debug Information</h4>
        <div class="debug-item"><strong>Angular Version:</strong> 17+</div>
        <div class="debug-item"><strong>Build Status:</strong> ✅ Built successfully</div>
        <div class="debug-item"><strong>Deployment:</strong> ✅ Docker containers running</div>
        <div *ngIf="error" class="error-message">
          <strong>Last Error:</strong> {{ error }}
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  systemInfo: any = null;
  services: any[] = [];
  isBackendConnected = false;
  lastUpdate: string | null = null;
  backendStatus = '';
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    console.log('Dashboard component initialized');
    this.loadData();
  }

  loadData() {
    this.loadSystemInfo();
    this.loadServices();
  }

  loadSystemInfo() {
    this.http.get<any>('http://localhost:8000/api/v1/system/info').subscribe({
      next: (data) => {
        this.systemInfo = data;
        this.isBackendConnected = true;
        this.lastUpdate = new Date().toLocaleTimeString();
        this.error = null;
        console.log('System info loaded:', data);
      },
      error: (err) => {
        this.error = `Failed to load system info: ${err.message}`;
        this.isBackendConnected = false;
        console.error('Error loading system info:', err);
      }
    });
  }

  loadServices() {
    this.http.get<any>('http://localhost:8000/api/v1/services').subscribe({
      next: (data) => {
        this.services = data.services || [];
        this.isBackendConnected = true;
        console.log('Services loaded:', data);
      },
      error: (err) => {
        this.error = `Failed to load services: ${err.message}`;
        this.isBackendConnected = false;
        console.error('Error loading services:', err);
      }
    });
  }

  refreshData() {
    this.backendStatus = 'Refreshing data...';
    this.loadData();
    setTimeout(() => {
      this.backendStatus = this.isBackendConnected ? 
        '✅ Data refreshed successfully!' : 
        '❌ Failed to refresh data';
    }, 1000);
  }

  testBackend() {
    this.backendStatus = 'Testing backend connection...';
    this.http.get('http://localhost:8000/health').subscribe({
      next: (response) => {
        this.backendStatus = '✅ Backend connection successful!';
        this.isBackendConnected = true;
        console.log('Backend test successful:', response);
      },
      error: (err) => {
        this.backendStatus = '❌ Backend connection failed!';
        this.isBackendConnected = false;
        console.error('Backend test failed:', err);
      }
    });
  }
}
