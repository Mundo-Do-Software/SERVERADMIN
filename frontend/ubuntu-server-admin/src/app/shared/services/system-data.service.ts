import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { SystemInfo, ServicesResponse, NetworkInterface, DiskInfo, ProcessInfo } from '../models/system.model';

@Injectable({
  providedIn: 'root'
})
export class SystemDataService {
  private readonly API_BASE = 'http://localhost:8000/api/v1';
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private systemInfoSubject = new BehaviorSubject<SystemInfo | null>(null);
  private servicesSubject = new BehaviorSubject<ServicesResponse | null>(null);

  public connectionStatus$ = this.connectionStatus.asObservable();
  public systemInfo$ = this.systemInfoSubject.asObservable();
  public services$ = this.servicesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startRealTimeUpdates();
  }

  private startRealTimeUpdates(): void {
    // Atualizar dados a cada 5 segundos
    timer(0, 5000).pipe(
      switchMap(() => this.getSystemInfo())
    ).subscribe();

    // Atualizar serviços a cada 10 segundos
    timer(0, 10000).pipe(
      switchMap(() => this.getServices())
    ).subscribe();
  }

  getSystemInfo(): Observable<SystemInfo> {
    return this.http.get<SystemInfo>(`${this.API_BASE}/system/info`).pipe(
      tap(data => {
        this.systemInfoSubject.next(data);
        this.connectionStatus.next(true);
      }),
      catchError(error => {
        this.connectionStatus.next(false);
        throw error;
      })
    );
  }

  getServices(): Observable<ServicesResponse> {
    return this.http.get<ServicesResponse>(`${this.API_BASE}/services`).pipe(
      tap(data => {
        this.servicesSubject.next(data);
        this.connectionStatus.next(true);
      }),
      catchError(error => {
        this.connectionStatus.next(false);
        throw error;
      })
    );
  }

  getNetworkInterfaces(): Observable<NetworkInterface[]> {
    return this.http.get<NetworkInterface[]>(`${this.API_BASE}/network/interfaces`);
  }

  getDiskInfo(): Observable<DiskInfo[]> {
    return this.http.get<DiskInfo[]>(`${this.API_BASE}/system/disks`);
  }

  getProcesses(): Observable<ProcessInfo[]> {
    return this.http.get<ProcessInfo[]>(`${this.API_BASE}/system/processes`);
  }

  getHealthCheck(): Observable<any> {
    return this.http.get(`${this.API_BASE}/../health`);
  }

  restartService(serviceName: string): Observable<any> {
    return this.http.post(`${this.API_BASE}/services/${serviceName}/restart`, {});
  }

  stopService(serviceName: string): Observable<any> {
    return this.http.post(`${this.API_BASE}/services/${serviceName}/stop`, {});
  }

  startService(serviceName: string): Observable<any> {
    return this.http.post(`${this.API_BASE}/services/${serviceName}/start`, {});
  }

  getCurrentSystemInfo(): SystemInfo | null {
    return this.systemInfoSubject.value;
  }

  getCurrentServices(): ServicesResponse | null {
    return this.servicesSubject.value;
  }

  isConnected(): boolean {
    return this.connectionStatus.value;
  }
}
