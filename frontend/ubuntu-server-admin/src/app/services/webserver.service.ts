import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NginxStatus {
  online: boolean;
  version: string | null;
  sites_enabled: number;
  sites_available: number;
  uptime: string | null;
}

export interface NginxSite {
  name: string;
  server_name: string;
  port: string;
  ssl_enabled: boolean;
  enabled: boolean;
  modified: string;
  type: string;
}

export interface CreateSiteRequest {
  name: string;
  server_name?: string;
  port?: string;
  type: 'static' | 'php' | 'proxy';
  root_path?: string;
  proxy_url?: string;
}

export interface ConfigTestResult {
  valid: boolean;
  message: string;
  output: string;
}

export interface CertbotStatus {
  installed: boolean;
  certificates: CertbotCertificate[];
  auto_renewal: boolean;
}

export interface CertbotCertificate {
  name: string;
  domains: string[];
  expiry: string;
  status: 'valid' | 'invalid';
}

export interface CertificateRequest {
  domain: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebserverService {
  private apiUrl = `${environment.apiUrl}/webserver`;

  constructor(private http: HttpClient) {}

  // Status do NGINX
  getNginxStatus(): Observable<NginxStatus> {
    return this.http.get<NginxStatus>(`${this.apiUrl}/nginx/status`);
  }

  // Sites
  getSites(): Observable<NginxSite[]> {
    return this.http.get<NginxSite[]>(`${this.apiUrl}/nginx/sites`);
  }

  createSite(site: CreateSiteRequest): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/nginx/sites`, site);
  }

  enableSite(siteName: string): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/nginx/sites/${siteName}/enable`, {});
  }

  disableSite(siteName: string): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/nginx/sites/${siteName}/disable`, {});
  }

  deleteSite(siteName: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/nginx/sites/${siteName}`);
  }

  // Controle do serviço
  startService(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/nginx/service/start`, {});
  }

  stopService(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/nginx/service/stop`, {});
  }

  restartService(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/nginx/service/restart`, {});
  }

  reloadService(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/nginx/service/reload`, {});
  }

  // Configuração
  testConfig(): Observable<ConfigTestResult> {
    return this.http.get<ConfigTestResult>(`${this.apiUrl}/nginx/config/test`);
  }

  // CERTBOT / SSL METHODS
  getCertbotStatus(): Observable<CertbotStatus> {
    return this.http.get<CertbotStatus>(`${this.apiUrl}/certbot/status`);
  }

  installCertbot(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/certbot/install`, {});
  }

  obtainCertificate(certRequest: CertificateRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/certbot/certificate`, certRequest);
  }

  renewCertificates(): Observable<any> {
    return this.http.post(`${this.apiUrl}/certbot/renew`, {});
  }

  revokeCertificate(domain: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/certbot/certificate/${domain}`);
  }

  manageAutoRenewal(action: 'enable' | 'disable'): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/certbot/auto-renewal/${action}`, {});
  }
}
