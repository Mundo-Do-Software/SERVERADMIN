import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SystemService, SystemInfo, ProcessInfo, DiskInfo, BenchmarkRequest, BenchmarkResult, BenchmarkJobStatus } from '../../core/services/system.service';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-system',
  imports: [CommonModule, FormsModule],
  templateUrl: './system.component.html',
  styleUrl: './system.component.scss'
})
export class SystemComponent implements OnInit, OnDestroy {
  systemInfo: SystemInfo | null = null;
  processes: ProcessInfo[] = [];
  disks: DiskInfo[] = [];
  isLoading = true;
  error: string | null = null;
  // Benchmark state
  benchType: 'cpu' | 'disk' | 'memory' | 'gpu' = 'cpu';
  benchDuration = 10;
  benchSizeMb = 256;
  benchThreads: number | null = null;
  benchRunning = false;
  benchResult: BenchmarkResult | null = null;
  
  private refreshSubscription: Subscription | null = null;
  private benchPollSub: Subscription | null = null;

  constructor(private systemService: SystemService) { }

  ngOnInit(): void {
    this.loadSystemData();
    
    // Auto-refresh every 30 seconds
    this.refreshSubscription = interval(30000).pipe(
      startWith(0),
      switchMap(() => this.systemService.getSystemInfo())
    ).subscribe({
      next: (data) => {
        this.systemInfo = data;
        this.error = null;
      },
      error: (error) => {
        console.error('Error loading system info:', error);
        this.error = error.message;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.benchPollSub) {
      this.benchPollSub.unsubscribe();
    }
  }

  loadSystemData(): void {
    this.isLoading = true;
    this.error = null;

    // Load system info
    this.systemService.getSystemInfo().subscribe({
      next: (data) => {
        this.systemInfo = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading system info:', error);
        this.error = error.message;
        this.isLoading = false;
      }
    });

    // Load processes
    this.systemService.getProcesses().subscribe({
      next: (data) => {
        this.processes = data.slice(0, 10); // Top 10 processes
      },
      error: (error) => {
        console.error('Error loading processes:', error);
      }
    });

    // Load disk info
    this.systemService.getDiskUsage().subscribe({
      next: (data) => {
        this.disks = data;
      },
      error: (error) => {
        console.error('Error loading disk info:', error);
      }
    });
  }

  refreshData(): void {
    this.loadSystemData();
  }

  getStatusClass(usage: number): string {
    if (usage >= 90) return 'danger';
    if (usage >= 70) return 'warning';
    return 'success';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  runBenchmark(): void {
    this.benchRunning = true;
    this.benchResult = null;
    if (this.benchPollSub) {
      this.benchPollSub.unsubscribe();
      this.benchPollSub = null;
    }
    const req: BenchmarkRequest = {
      type: this.benchType,
      duration: this.benchDuration,
      size_mb: this.benchType === 'disk' || this.benchType === 'memory' ? this.benchSizeMb : undefined,
      threads: this.benchType === 'cpu' ? (this.benchThreads ?? undefined) : undefined,
    };
    this.systemService.startBenchmark(req).subscribe({
      next: ({ job_id }) => {
        this.benchPollSub = interval(500).pipe(
          switchMap(() => this.systemService.getBenchmarkStatus(job_id))
        ).subscribe({
          next: (st: BenchmarkJobStatus) => {
            if (st.status === 'completed') {
              this.benchResult = st.result || { type: this.benchType, message: 'Concluído' };
              this.benchRunning = false;
              this.benchPollSub?.unsubscribe();
              this.benchPollSub = null;
            } else if (st.status === 'failed') {
              this.benchResult = { type: this.benchType, error: st.error || 'Falha' };
              this.benchRunning = false;
              this.benchPollSub?.unsubscribe();
              this.benchPollSub = null;
            }
            // else running/queued, UI will show progress
          },
          error: (err) => {
            this.benchResult = { type: this.benchType, error: err.message };
            this.benchRunning = false;
            this.benchPollSub?.unsubscribe();
            this.benchPollSub = null;
          }
        });
      },
      error: (err) => {
        this.benchResult = { type: this.benchType, error: err.message };
        this.benchRunning = false;
      }
    });
  }
}
