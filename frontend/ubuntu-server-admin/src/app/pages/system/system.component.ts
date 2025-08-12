import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemService, SystemInfo, ProcessInfo, DiskInfo } from '../../core/services/system.service';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-system',
  imports: [CommonModule],
  templateUrl: './system.component.html',
  styleUrl: './system.component.scss'
})
export class SystemComponent implements OnInit, OnDestroy {
  systemInfo: SystemInfo | null = null;
  processes: ProcessInfo[] = [];
  disks: DiskInfo[] = [];
  isLoading = true;
  error: string | null = null;
  
  private refreshSubscription: Subscription | null = null;

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
}
