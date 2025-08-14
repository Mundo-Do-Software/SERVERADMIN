import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Tipos faltantes
export interface ProcessInfo {
  pid: number;
  name: string;
  username?: string;
  cpu_percent?: number;
  memory_percent?: number;
  status?: string;
}

export interface DiskInfo {
  device?: string;
  mountpoint?: string;
  fstype?: string;
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface SystemNetworkAddress {
  address: string;
  netmask?: string;
  family?: string;
}

export interface SystemNetworkInterface {
  name: string;
  mac?: string;
  is_up?: boolean;
  speed_mbps?: number | null;
  ipv4?: string;
  ipv6?: string;
  addresses?: SystemNetworkAddress[];
}

export type BenchmarkType = 'cpu' | 'disk' | 'memory' | 'gpu';

export interface BenchmarkRequest {
  type: BenchmarkType;
  duration?: number;
  size_mb?: number;
  threads?: number;
}

export interface BenchmarkResult {
  type: BenchmarkType;
  [key: string]: any;
}

export interface BenchmarkJobStatus {
  id: string;
  type: BenchmarkType;
  status: 'queued' | 'running' | 'completed' | 'canceled' | 'error' | 'failed';
  progress?: number | null;
  result?: BenchmarkResult | any;
  error?: string | null;
  logs?: string[];
  metrics?: any;
  started_at?: string;
}

export interface VersionInfo {
  repo?: string;
  current_commit?: string;
  current_date?: string;
  branch?: string;
  describe?: string;
  remote_url?: string;
  ahead?: number | null;
  behind?: number | null;
  update_available?: boolean;
  changelog?: string[];
}

export interface UpdateStartResponse {
  started: boolean;
  pid?: number;
  log?: string;
}

// Estrutura com campos usados no app (mantém compat)
export interface SystemInfo {
  hostname: string;
  os_version: string;
  uptime: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;

  cpu: any;
  memory: any;
  disk: any;
  gpu: any[];

  temperatures?: any;
  temperature?: number | null;
  load_average?: any;
  kernel_version?: string;
  architecture?: string;
  boot_time?: string; // ISO/string da data/hora de boot
}

@Injectable({ providedIn: 'root' })
export class SystemService {
  private base = '/api/v1';
  constructor(private http: HttpClient) {}

  // System data
  getSystemInfo(): Observable<SystemInfo> {
    return this.http.get<SystemInfo>(`${this.base}/system/info`);
  }
  getProcesses(): Observable<ProcessInfo[]> {
    return this.http.get<ProcessInfo[]>(`${this.base}/system/processes`);
  }
  getDiskUsage(): Observable<DiskInfo[]> {
    return this.http.get<DiskInfo[]>(`${this.base}/system/disks`);
  }
  getNetworkInterfaces(): Observable<SystemNetworkInterface[]> {
    return this.http.get<SystemNetworkInterface[]>(`${this.base}/system/network`);
  }

  // Version/Update
  getVersionInfo(): Observable<VersionInfo> {
    return this.http.get<VersionInfo>(`${this.base}/system/version`);
  }
  startUpdateBackground(): Observable<UpdateStartResponse> {
    return this.http.post<UpdateStartResponse>(`${this.base}/system/update/start`, {});
  }

  // Benchmarks (assíncronos)
  startBenchmarkJob(req: BenchmarkRequest): Observable<{ job_id: string }> {
    return this.http.post<{ job_id: string }>(`${this.base}/system/benchmark/start`, req);
  }
  getBenchmarkStatus(jobId: string): Observable<BenchmarkJobStatus> {
    return this.http.get<BenchmarkJobStatus>(`${this.base}/system/benchmark/status/${jobId}`);
  }
  cancelBenchmark(jobId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/system/benchmark/cancel/${jobId}`, {});
  }
}
