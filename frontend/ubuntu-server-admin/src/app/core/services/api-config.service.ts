import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  private readonly baseUrl = environment.apiBaseUrl || environment.apiUrl.replace(/\/(v\d+)?$/, '');
  
  getApiUrl(): string {
    return this.baseUrl;
  }
  
  getHealthUrl(): string {
    // Derive from apiUrl base to work in any env (proxy or direct)
    const base = environment.apiUrl.replace(/\/?api\/v\d+.*/, '');
    return `${base}/health`;
  }
  
  getDocsUrl(): string {
    const base = environment.apiUrl.replace(/\/?api\/v\d+.*/, '');
    return `${base}/docs`;
  }
}
