import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SecurityAudit {
  id: string;
  timestamp: string;
  category: 'authentication' | 'authorization' | 'file_access' | 'network' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  event: string;
  user?: string;
  ip_address?: string;
  details: any;
  status: 'active' | 'resolved' | 'false_positive';
}

export interface FailedLogin {
  timestamp: string;
  username: string;
  ip_address: string;
  service: string;
  method: string;
  attempts: number;
}

export interface ActiveSession {
  user: string;
  terminal: string;
  login_time: string;
  idle_time: string;
  ip_address?: string;
  pid: number;
}

export interface SSHKey {
  id: string;
  user: string;
  key_type: string;
  fingerprint: string;
  comment: string;
  created_at: string;
  last_used?: string;
  enabled: boolean;
}

export interface SecurityPolicy {
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_digits: boolean;
    require_special_chars: boolean;
    max_age_days: number;
    history_count: number;
  };
  lockout_policy: {
    max_failed_attempts: number;
    lockout_duration_minutes: number;
    reset_time_minutes: number;
  };
  session_policy: {
    max_idle_time_minutes: number;
    max_session_time_minutes: number;
  };
}

export interface FilePermission {
  path: string;
  owner: string;
  group: string;
  permissions: string;
  octal: string;
  size: number;
  modified: string;
  is_executable: boolean;
  is_suid: boolean;
  is_sgid: boolean;
  is_sticky: boolean;
}

export interface ProcessSecurity {
  pid: number;
  name: string;
  user: string;
  status: string;
  cpu_percent: number;
  memory_percent: number;
  open_files: number;
  connections: number;
  capabilities: string[];
  is_privileged: boolean;
  command_line: string;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getSecurityAudits(limit?: number): Observable<SecurityAudit[]> {
    const params: any = {};
    if (limit) {
      params.limit = limit.toString();
    }
    return this.http.get<SecurityAudit[]>(`${this.apiUrl}/security/audits`, 
      Object.keys(params).length > 0 ? { params } : {})
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getFailedLogins(limit?: number): Observable<FailedLogin[]> {
    const params: any = {};
    if (limit) {
      params.limit = limit.toString();
    }
    return this.http.get<FailedLogin[]>(`${this.apiUrl}/security/failed-logins`, 
      Object.keys(params).length > 0 ? { params } : {})
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getActiveSessions(): Observable<ActiveSession[]> {
    return this.http.get<ActiveSession[]>(`${this.apiUrl}/security/sessions`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  terminateSession(pid: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/security/sessions/${pid}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getSSHKeys(user?: string): Observable<SSHKey[]> {
    const params: any = {};
    if (user) {
      params.user = user;
    }
    return this.http.get<SSHKey[]>(`${this.apiUrl}/security/ssh-keys`, 
      Object.keys(params).length > 0 ? { params } : {})
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  addSSHKey(user: string, publicKey: string, comment?: string): Observable<{ message: string; key_id: string }> {
    const body = { user, public_key: publicKey, comment };
    return this.http.post<{ message: string; key_id: string }>(`${this.apiUrl}/security/ssh-keys`, body)
      .pipe(
        catchError(this.handleError)
      );
  }

  removeSSHKey(keyId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/security/ssh-keys/${keyId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  toggleSSHKey(keyId: string, enabled: boolean): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/security/ssh-keys/${keyId}`, { enabled })
      .pipe(
        catchError(this.handleError)
      );
  }

  getSecurityPolicy(): Observable<SecurityPolicy> {
    return this.http.get<SecurityPolicy>(`${this.apiUrl}/security/policy`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  updateSecurityPolicy(policy: Partial<SecurityPolicy>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/security/policy`, policy)
      .pipe(
        catchError(this.handleError)
      );
  }

  scanFilePermissions(path: string, recursive: boolean = false): Observable<FilePermission[]> {
    const params = { path, recursive: recursive.toString() };
    return this.http.get<FilePermission[]>(`${this.apiUrl}/security/file-permissions`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  findSuidFiles(): Observable<FilePermission[]> {
    return this.http.get<FilePermission[]>(`${this.apiUrl}/security/suid-files`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  findWorldWritableFiles(): Observable<FilePermission[]> {
    return this.http.get<FilePermission[]>(`${this.apiUrl}/security/world-writable`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  changeFilePermissions(path: string, permissions: string): Observable<{ message: string }> {
    const body = { path, permissions };
    return this.http.post<{ message: string }>(`${this.apiUrl}/security/change-permissions`, body)
      .pipe(
        catchError(this.handleError)
      );
  }

  getProcessSecurity(): Observable<ProcessSecurity[]> {
    return this.http.get<ProcessSecurity[]>(`${this.apiUrl}/security/processes`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getPrivilegedProcesses(): Observable<ProcessSecurity[]> {
    return this.http.get<ProcessSecurity[]>(`${this.apiUrl}/security/processes/privileged`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  runSecurityScan(): Observable<{ message: string; scan_id: string }> {
    return this.http.post<{ message: string; scan_id: string }>(`${this.apiUrl}/security/scan`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  getScanResults(scanId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/scan/${scanId}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getSystemHardening(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/hardening`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  applyHardening(options: string[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/security/hardening`, { options })
      .pipe(
        catchError(this.handleError)
      );
  }

  getIntrusionDetection(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/intrusion-detection`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  updateIntrusionDetection(config: any): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/security/intrusion-detection`, config)
      .pipe(
        catchError(this.handleError)
      );
  }

  getCertificates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/security/certificates`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  generateCertificate(domain: string, type: 'self-signed' | 'letsencrypt'): Observable<{ message: string }> {
    const body = { domain, type };
    return this.http.post<{ message: string }>(`${this.apiUrl}/security/certificates`, body)
      .pipe(
        catchError(this.handleError)
      );
  }

  revokeCertificate(certificateId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/security/certificates/${certificateId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getVulnerabilities(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/security/vulnerabilities`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  scanVulnerabilities(): Observable<{ message: string; scan_id: string }> {
    return this.http.post<{ message: string; scan_id: string }>(`${this.apiUrl}/security/vulnerabilities/scan`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Erro desconhecido!';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'Não foi possível conectar ao servidor.';
          break;
        case 400:
          errorMessage = 'Solicitação inválida.';
          break;
        case 401:
          errorMessage = 'Não autorizado.';
          break;
        case 403:
          errorMessage = 'Acesso negado.';
          break;
        case 404:
          errorMessage = 'Recurso não encontrado.';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor.';
          break;
        case 502:
          errorMessage = 'Erro de gateway.';
          break;
        case 503:
          errorMessage = 'Serviço indisponível.';
          break;
        default:
          errorMessage = `Erro ${error.status}: ${error.message}`;
      }
    }
    
    console.error('SecurityService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
