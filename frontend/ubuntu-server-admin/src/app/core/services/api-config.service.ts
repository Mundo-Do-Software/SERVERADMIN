import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  private readonly baseUrl = environment.apiBaseUrl;
  
  getApiUrl(): string {
    return this.baseUrl;
  }
  
  getHealthUrl(): string {
    return environment.production ? '/health' : 'http://localhost:8000/health';
  }
  
  getDocsUrl(): string {
    return environment.production ? '/docs' : 'http://localhost:8000/docs';
  }
}
