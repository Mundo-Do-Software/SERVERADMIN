import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Package {
  name: string;
  version: string;
  description: string;
  status: 'installed' | 'available' | 'upgradable';
  size: string;
  section: string;
  priority: string;
  installed_size?: string;
  maintainer?: string;
  architecture?: string;
  depends?: string[];
}

export interface PackageSearchResult {
  packages: Package[];
  total: number;
  page: number;
  per_page: number;
}

export interface InstallPackageRequest {
  packages: string[];
  auto_confirm?: boolean;
}

export interface UpdateInfo {
  upgradable_packages: number;
  security_updates: number;
  last_update_check: string;
  update_available: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PackageService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  searchPackages(query: string, page: number = 1, perPage: number = 20): Observable<PackageSearchResult> {
    const params = {
      q: query,
      page: page.toString(),
      per_page: perPage.toString()
    };
    
    return this.http.get<PackageSearchResult>(`${this.apiUrl}/packages/search`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getInstalledPackages(page: number = 1, perPage: number = 50): Observable<PackageSearchResult> {
    const params = {
      page: page.toString(),
      per_page: perPage.toString()
    };
    
    return this.http.get<PackageSearchResult>(`${this.apiUrl}/packages/installed`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getUpgradablePackages(): Observable<Package[]> {
    return this.http.get<Package[]>(`${this.apiUrl}/packages/upgradable`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  getPackageInfo(packageName: string): Observable<Package> {
    return this.http.get<Package>(`${this.apiUrl}/packages/${packageName}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  installPackages(request: InstallPackageRequest): Observable<{ message: string; job_id?: string }> {
    return this.http.post<{ message: string; job_id?: string }>(`${this.apiUrl}/packages/install`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  removePackages(packages: string[], purge: boolean = false): Observable<{ message: string; job_id?: string }> {
    const request = { packages, purge };
    return this.http.post<{ message: string; job_id?: string }>(`${this.apiUrl}/packages/remove`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  upgradePackages(packages?: string[]): Observable<{ message: string; job_id?: string }> {
    const request = packages ? { packages } : {};
    return this.http.post<{ message: string; job_id?: string }>(`${this.apiUrl}/packages/upgrade`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  updatePackageList(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/packages/update`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  getUpdateInfo(): Observable<UpdateInfo> {
    return this.http.get<UpdateInfo>(`${this.apiUrl}/packages/update-info`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  autoRemove(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/packages/autoremove`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  autoclean(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/packages/autoclean`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  getJobStatus(jobId: string): Observable<{ status: string; output?: string; completed?: boolean }> {
    return this.http.get<{ status: string; output?: string; completed?: boolean }>(`${this.apiUrl}/packages/jobs/${jobId}`)
      .pipe(
        retry(2),
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
          errorMessage = 'Pacote não encontrado.';
          break;
        case 409:
          errorMessage = 'Conflito na operação.';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor.';
          break;
        default:
          errorMessage = `Erro ${error.status}: ${error.message}`;
      }
    }
    
    console.error('PackageService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
