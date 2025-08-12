import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { SystemService, SystemInfo } from '../core/services/system.service';
import { Subscription, interval } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-system-charts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="charts-container">
      <div class="charts-header">
        <h2>Análise Detalhada do Sistema</h2>
        <p>Gráficos em tempo real do hardware e recursos</p>
      </div>

      <div class="charts-grid">
        <!-- CPU Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h3><i class="fas fa-microchip"></i> Processador</h3>
            <div class="chart-stats">
              <span class="stat"><strong>{{ systemInfo?.cpu?.cores_physical || 0 }}</strong> Cores Físicos</span>
              <span class="stat"><strong>{{ systemInfo?.cpu?.cores_logical || 0 }}</strong> Threads</span>
              <span class="stat" *ngIf="systemInfo?.cpu?.frequency?.current">
                <strong>{{ ((systemInfo?.cpu?.frequency?.current || 0) / 1000).toFixed(2) }}</strong> GHz
              </span>
            </div>
          </div>
          <div class="chart-wrapper">
            <canvas #cpuChart width="400" height="300"></canvas>
          </div>
        </div>

        <!-- Memory Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h3><i class="fas fa-memory"></i> Memória RAM</h3>
            <div class="chart-stats">
              <span class="stat">Total: <strong>{{ formatBytes(systemInfo?.memory?.total || 0) }}</strong></span>
              <span class="stat">Usado: <strong>{{ formatBytes(systemInfo?.memory?.used || 0) }}</strong></span>
              <span class="stat">Livre: <strong>{{ formatBytes(systemInfo?.memory?.free || 0) }}</strong></span>
            </div>
          </div>
          <div class="chart-wrapper">
            <canvas #memoryChart width="400" height="300"></canvas>
          </div>
        </div>

        <!-- Disk Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h3><i class="fas fa-hdd"></i> Armazenamento</h3>
            <div class="chart-stats">
              <span class="stat">Total: <strong>{{ formatBytes(systemInfo?.disk?.total || 0) }}</strong></span>
              <span class="stat">Usado: <strong>{{ formatBytes(systemInfo?.disk?.used || 0) }}</strong></span>
              <span class="stat">Livre: <strong>{{ formatBytes(systemInfo?.disk?.free || 0) }}</strong></span>
            </div>
          </div>
          <div class="chart-wrapper">
            <canvas #diskChart width="400" height="300"></canvas>
          </div>
        </div>

        <!-- GPU Chart -->
        <div class="chart-card" *ngIf="systemInfo?.gpu?.length">
          <div class="chart-header">
            <h3><i class="fas fa-display"></i> Placa de Vídeo</h3>
            <div class="chart-stats" *ngFor="let gpu of systemInfo?.gpu">
              <span class="stat">{{ gpu.name }}</span>
              <span class="stat" *ngIf="gpu.memory_total">VRAM: <strong>{{ gpu.memory_total }}MB</strong></span>
              <span class="stat" *ngIf="gpu.temperature">Temp: <strong>{{ gpu.temperature }}°C</strong></span>
            </div>
          </div>
          <div class="chart-wrapper">
            <canvas #gpuChart width="400" height="300"></canvas>
          </div>
        </div>

        <!-- System Load Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h3><i class="fas fa-chart-line"></i> Carga do Sistema</h3>
            <div class="chart-stats">
              <span class="stat">Load 1m: <strong>{{ systemInfo?.load_average?.[0]?.toFixed(2) || '0.00' }}</strong></span>
              <span class="stat">Load 5m: <strong>{{ systemInfo?.load_average?.[1]?.toFixed(2) || '0.00' }}</strong></span>
              <span class="stat">Load 15m: <strong>{{ systemInfo?.load_average?.[2]?.toFixed(2) || '0.00' }}</strong></span>
            </div>
          </div>
          <div class="chart-wrapper">
            <canvas #loadChart width="400" height="300"></canvas>
          </div>
        </div>

        <!-- Real-time Usage Chart -->
        <div class="chart-card chart-wide">
          <div class="chart-header">
            <h3><i class="fas fa-chart-area"></i> Uso em Tempo Real</h3>
            <div class="chart-stats">
              <span class="stat">CPU: <strong>{{ systemInfo?.cpu_usage || 0 }}%</strong></span>
              <span class="stat">RAM: <strong>{{ systemInfo?.memory_usage || 0 }}%</strong></span>
              <span class="stat">Disco: <strong>{{ systemInfo?.disk_usage || 0 }}%</strong></span>
            </div>
          </div>
          <div class="chart-wrapper">
            <canvas #realtimeChart width="800" height="400"></canvas>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .charts-container {
      padding: 2rem;
      background: var(--bg-primary);
      min-height: 100vh;
    }

    .charts-header {
      text-align: center;
      margin-bottom: 3rem;

      h2 {
        font-size: 2.5rem;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
        font-weight: 700;
      }

      p {
        color: var(--text-secondary);
        font-size: 1.1rem;
      }
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 2rem;
    }

    .chart-card {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--border-light);
      transition: all var(--transition-normal);

      &:hover {
        border-color: var(--primary-color);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      &.chart-wide {
        grid-column: 1 / -1;
      }
    }

    .chart-header {
      margin-bottom: 1.5rem;

      h3 {
        color: var(--text-primary);
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        i {
          color: var(--primary-color);
        }
      }
    }

    .chart-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .stat {
      background: var(--bg-tertiary);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      color: var(--text-secondary);

      strong {
        color: var(--primary-color);
        font-weight: 600;
      }
    }

    .chart-wrapper {
      position: relative;
      height: 300px;
      
      canvas {
        max-height: 100%;
        width: 100% !important;
        height: auto !important;
      }
    }

    .chart-wide .chart-wrapper {
      height: 400px;
    }

    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
      
      .chart-card {
        min-width: unset;
      }

      .charts-header h2 {
        font-size: 2rem;
      }

      .chart-stats {
        justify-content: center;
      }
    }
  `]
})
export class SystemChartsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('cpuChart') cpuChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('memoryChart') memoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('diskChart') diskChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gpuChart') gpuChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('loadChart') loadChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('realtimeChart') realtimeChartRef!: ElementRef<HTMLCanvasElement>;

  systemInfo: SystemInfo | null = null;
  private subscription: Subscription = new Subscription();
  
  private cpuChart: Chart | null = null;
  private memoryChart: Chart | null = null;
  private diskChart: Chart | null = null;
  private gpuChart: Chart | null = null;
  private loadChart: Chart | null = null;
  private realtimeChart: Chart | null = null;

  // Dados para gráfico em tempo real
  private realtimeData = {
    labels: [] as string[],
    cpuData: [] as number[],
    memoryData: [] as number[],
    diskData: [] as number[]
  };

  constructor(private systemService: SystemService) {}

  ngOnInit() {
    this.loadSystemInfo();
    
    // Atualizar a cada 5 segundos
    this.subscription.add(
      interval(5000).subscribe(() => {
        this.loadSystemInfo();
      })
    );
  }

  ngAfterViewInit() {
    // Aguardar um pouco para garantir que os dados foram carregados
    setTimeout(() => {
      if (this.systemInfo) {
        this.initializeCharts();
      }
    }, 2000);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.destroyCharts();
  }

  private loadSystemInfo() {
    this.systemService.getSystemInfo().subscribe({
      next: (data: SystemInfo) => {
        this.systemInfo = data;
        this.updateRealtimeData();
        
        // Se os gráficos não existem ainda, criar todos
        if (!this.cpuChart || !this.memoryChart || !this.diskChart) {
          setTimeout(() => this.initializeCharts(), 500);
        } else {
          this.updateCharts();
        }
      },
      error: (error) => {
        console.error('Error loading system info:', error);
      }
    });
  }

  private updateRealtimeData() {
    if (!this.systemInfo) return;

    const now = new Date().toLocaleTimeString();
    
    this.realtimeData.labels.push(now);
    this.realtimeData.cpuData.push(this.systemInfo.cpu_usage);
    this.realtimeData.memoryData.push(this.systemInfo.memory_usage);
    this.realtimeData.diskData.push(this.systemInfo.disk_usage);

    // Manter apenas os últimos 20 pontos
    if (this.realtimeData.labels.length > 20) {
      this.realtimeData.labels.shift();
      this.realtimeData.cpuData.shift();
      this.realtimeData.memoryData.shift();
      this.realtimeData.diskData.shift();
    }
  }

  private initializeCharts() {
    if (!this.systemInfo) {
      console.log('SystemInfo não carregado ainda');
      return;
    }

    console.log('Inicializando gráficos com dados:', this.systemInfo);

    this.createCpuChart();
    this.createMemoryChart();
    this.createDiskChart();
    this.createLoadChart();
    this.createRealtimeChart();
    
    if (this.systemInfo.gpu && this.systemInfo.gpu.length > 0) {
      this.createGpuChart();
    }
  }

  private createCpuChart() {
    if (!this.systemInfo?.cpu) {
      console.log('CPU data não disponível');
      return;
    }

    const ctx = this.cpuChartRef?.nativeElement?.getContext('2d');
    if (!ctx) {
      console.log('Canvas CPU não encontrado');
      return;
    }

    console.log('Criando gráfico CPU');

    this.cpuChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Em Uso', 'Disponível'],
        datasets: [{
          data: [this.systemInfo.cpu_usage, 100 - this.systemInfo.cpu_usage],
          backgroundColor: ['#ef4444', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  private createMemoryChart() {
    if (!this.systemInfo?.memory) return;

    const ctx = this.memoryChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const total = this.systemInfo.memory.total;
    const used = this.systemInfo.memory.used;
    const free = this.systemInfo.memory.free;
    const available = this.systemInfo.memory.available;

    this.memoryChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Usado', 'Disponível', 'Livre'],
        datasets: [{
          data: [used, available - used, free],
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  private createDiskChart() {
    if (!this.systemInfo?.disk) return;

    const ctx = this.diskChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.diskChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Usado', 'Livre'],
        datasets: [{
          data: [this.systemInfo.disk.used, this.systemInfo.disk.free],
          backgroundColor: ['#3b82f6', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  private createGpuChart() {
    if (!this.systemInfo?.gpu?.[0]) return;

    const ctx = this.gpuChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const gpu = this.systemInfo.gpu[0];
    
    this.gpuChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Utilização GPU', 'Memória VRAM', 'Temperatura'],
        datasets: [{
          label: 'GPU Stats',
          data: [
            gpu.utilization || 0,
            gpu.memory_total && gpu.memory_used ? (gpu.memory_used / gpu.memory_total) * 100 : 0,
            gpu.temperature || 0
          ],
          backgroundColor: ['#8b5cf6', '#06b6d4', '#f59e0b']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  private createLoadChart() {
    if (!this.systemInfo?.load_average) return;

    const ctx = this.loadChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.loadChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['1 min', '5 min', '15 min'],
        datasets: [{
          label: 'Load Average',
          data: this.systemInfo.load_average,
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  private createRealtimeChart() {
    const ctx = this.realtimeChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.realtimeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.realtimeData.labels,
        datasets: [
          {
            label: 'CPU %',
            data: this.realtimeData.cpuData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: false
          },
          {
            label: 'Memória %',
            data: this.realtimeData.memoryData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: false
          },
          {
            label: 'Disco %',
            data: this.realtimeData.diskData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        },
        animation: {
          duration: 0
        }
      }
    });
  }

  private updateCharts() {
    if (!this.systemInfo) return;

    // Atualizar gráfico de CPU
    if (this.cpuChart && this.systemInfo.cpu) {
      this.cpuChart.data.datasets[0].data = [
        this.systemInfo.cpu_usage,
        100 - this.systemInfo.cpu_usage
      ];
      this.cpuChart.update('none');
    }

    // Atualizar gráfico de memória
    if (this.memoryChart && this.systemInfo.memory) {
      const total = this.systemInfo.memory.total;
      const used = this.systemInfo.memory.used;
      const free = this.systemInfo.memory.free;
      const available = this.systemInfo.memory.available;

      this.memoryChart.data.datasets[0].data = [used, available - used, free];
      this.memoryChart.update('none');
    }

    // Atualizar gráfico de disco
    if (this.diskChart && this.systemInfo.disk) {
      this.diskChart.data.datasets[0].data = [
        this.systemInfo.disk.used,
        this.systemInfo.disk.free
      ];
      this.diskChart.update('none');
    }

    // Atualizar gráfico de GPU
    if (this.gpuChart && this.systemInfo.gpu?.[0]) {
      const gpu = this.systemInfo.gpu[0];
      this.gpuChart.data.datasets[0].data = [
        gpu.utilization || 0,
        gpu.memory_total && gpu.memory_used ? (gpu.memory_used / gpu.memory_total) * 100 : 0,
        gpu.temperature || 0
      ];
      this.gpuChart.update('none');
    }

    // Atualizar gráfico de load
    if (this.loadChart && this.systemInfo.load_average) {
      this.loadChart.data.datasets[0].data = this.systemInfo.load_average;
      this.loadChart.update('none');
    }

    // Atualizar gráfico em tempo real
    if (this.realtimeChart) {
      this.realtimeChart.data.labels = this.realtimeData.labels;
      this.realtimeChart.data.datasets[0].data = this.realtimeData.cpuData;
      this.realtimeChart.data.datasets[1].data = this.realtimeData.memoryData;
      this.realtimeChart.data.datasets[2].data = this.realtimeData.diskData;
      this.realtimeChart.update('none');
    }
  }

  private destroyCharts() {
    [this.cpuChart, this.memoryChart, this.diskChart, this.gpuChart, this.loadChart, this.realtimeChart]
      .forEach(chart => chart?.destroy());
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
