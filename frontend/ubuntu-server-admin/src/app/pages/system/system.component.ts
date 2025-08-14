import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, JsonPipe, DecimalPipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import {
  SystemService,
  SystemInfo,
  ProcessInfo,
  DiskInfo,
  VersionInfo,
  UpdateStartResponse,
  BenchmarkRequest,
  BenchmarkJobStatus,
  BenchmarkResult
} from '../../core/services/system.service';

@Component({
  selector: 'app-system',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonPipe, DecimalPipe, SlicePipe],
  templateUrl: './system.component.html',
  styleUrls: ['./system.component.scss']
})
export class SystemComponent implements OnInit, OnDestroy {
  // Estado básico
  isLoading = false;
  error: string | null = null;

  systemInfo?: SystemInfo;
  processes: ProcessInfo[] = [];
  disks: DiskInfo[] = [];

  // Auto refresh
  private refreshSubscription?: Subscription;

  // Versão/Update
  versionInfo?: VersionInfo;
  versionLoading = false;
  updateLoading = false;
  updateInProgress = false;
  updateMessage = '';
  private versionPoll?: any;

  // Benchmark UI
  benchType: 'cpu' | 'disk' | 'memory' | 'gpu' = 'cpu';
  benchDuration = 10;
  benchSizeMb = 256;
  benchThreads?: number;
  benchRunning = false;
  benchProgress = 0;
  benchResult: BenchmarkResult | null = null;
  private benchPollSub?: Subscription;

  // Compat com template
  get updateStarting(): boolean { return this.updateLoading || this.updateInProgress; }
  startUpdate(): void { this.startBackgroundUpdate(); }

  constructor(private systemService: SystemService) { }

  ngOnInit(): void {
    this.startAutoRefresh();
    this.loadVersionInfo();
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
    this.benchPollSub?.unsubscribe();
    if (this.versionPoll) { clearInterval(this.versionPoll); this.versionPoll = undefined; }
  }

  startAutoRefresh(): void {
    this.refreshSubscription = interval(2000).pipe(
      startWith(0),
      switchMap(() => {
        this.isLoading = true;
        return this.systemService.getSystemInfo();
      })
    ).subscribe({
      next: (data: SystemInfo) => {
        this.systemInfo = data;
        this.isLoading = false;
        // opcional: carregar processos/discos em paralelo
        this.systemService.getProcesses().subscribe({
          next: (ps: ProcessInfo[]) => this.processes = ps,
          error: () => { }
        });
        this.systemService.getDiskUsage().subscribe({
          next: (ds: DiskInfo[]) => this.disks = ds,
          error: () => { }
        });
      },
      error: (err: any) => {
        this.error = err?.message || 'Falha ao carregar informações.';
        this.isLoading = false;
      }
    });
  }

  refreshData(): void {
    this.systemService.getSystemInfo().subscribe({
      next: (data: SystemInfo) => { this.systemInfo = data; },
      error: () => { }
    });
    this.systemService.getProcesses().subscribe({
      next: (ps: ProcessInfo[]) => this.processes = ps,
      error: () => { }
    });
    this.systemService.getDiskUsage().subscribe({
      next: (ds: DiskInfo[]) => this.disks = ds,
      error: () => { }
    });
  }

  // Versão/Atualização
  loadVersionInfo(): void {
    this.versionLoading = true;
    this.systemService.getVersionInfo().subscribe({
      next: (info: VersionInfo) => { this.versionInfo = info; this.versionLoading = false; },
      error: () => { this.versionLoading = false; }
    });
  }

  startBackgroundUpdate(): void {
    if (this.updateInProgress || this.updateLoading) return;
    this.updateLoading = true;
    this.updateMessage = '';
    this.systemService.startUpdateBackground().subscribe({
      next: (res: UpdateStartResponse) => {
        this.updateLoading = false;
        if (res?.started) {
          this.updateInProgress = true;
          this.updateMessage = 'Atualização iniciada em segundo plano.';
          this.versionPoll = setInterval(() => {
            this.systemService.getVersionInfo().subscribe({
              next: (info: VersionInfo) => {
                const before = this.versionInfo?.current_commit;
                this.versionInfo = info;
                const changed = before && info.current_commit && before !== info.current_commit;
                if (changed || info.update_available === false) {
                  this.updateInProgress = false;
                  if (this.versionPoll) { clearInterval(this.versionPoll); this.versionPoll = undefined; }
                  this.updateMessage = 'Atualização concluída.';
                }
              },
              error: () => { }
            });
          }, 1500);
        } else {
          this.updateMessage = res?.log || 'Não foi possível iniciar a atualização.';
        }
      },
      error: (err: any) => {
        this.updateLoading = false;
        this.updateMessage = err?.message || 'Falha ao iniciar a atualização.';
      }
    });
  }

  // Benchmark assíncrono
  runBenchmark(): void {
    const req: BenchmarkRequest = {
      type: this.benchType,
      duration: this.benchDuration,
      size_mb: (this.benchType === 'disk' || this.benchType === 'memory') ? this.benchSizeMb : undefined,
      threads: this.benchType === 'cpu' ? this.benchThreads : undefined
    };
    this.benchRunning = true;
    this.benchProgress = 0;
    this.benchResult = null;

    this.systemService.startBenchmarkJob(req).subscribe({
      next: ({ job_id }: { job_id: string }) => {
        this.benchPollSub?.unsubscribe();
        this.benchPollSub = interval(1000).pipe(
          switchMap(() => this.systemService.getBenchmarkStatus(job_id))
        ).subscribe({
          next: (st: BenchmarkJobStatus) => {
            this.benchProgress = Math.max(0, Math.min(100, Math.round((st.progress ?? 0))));
            if (st.status === 'completed' || st.status === 'canceled' || st.status === 'error' || st.status === 'failed') {
              this.benchRunning = false;
              this.benchResult = st.result ?? { status: st.status, error: st.error };
              this.benchPollSub?.unsubscribe();
            }
          },
          error: () => {
            this.benchRunning = false;
            this.benchPollSub?.unsubscribe();
          }
        });
      },
      error: () => { this.benchRunning = false; }
    });
  }

  // Classe visual para barras
  getStatusClass(val: number): string {
    if (val >= 90) return 'danger';
    if (val >= 70) return 'warning';
    return 'ok';
  }
}
