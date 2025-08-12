import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PackageInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  installed: boolean;
  version?: string;
  availableVersion?: string;
  hasAdminPanel: boolean;
  adminRoute?: string;
  icon: string;
  status: 'installed' | 'available' | 'updating' | 'error';
  dependencies?: string[];
  size?: string;
  lastUpdated?: string;
  hasUpdates?: boolean;
}

export interface PackageInstallRequest {
  packageId: string;
  version?: string;
  options?: Record<string, any>;
}

export interface PackageActionResponse {
  success: boolean;
  message: string;
  logs?: string[];
}

export interface PackageVersionInfo {
  packageId: string;
  packageName: string;
  versionManager: string;
  availableVersions: string[];
  installedVersions: string[];
  defaultVersion: string | null;
  supportsMultipleVersions: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PackageService {
  private readonly apiUrl = `${environment.apiUrl}/packages-essentials`;

  constructor(private http: HttpClient) {}

  /**
   * Obter lista de pacotes com paginação
   */
  getPackages(page: number = 1, pageSize: number = 20, category?: string, search?: string): Observable<{
    packages: PackageInfo[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const params: any = { page, pageSize };
    if (category) params.category = category;
    if (search) params.search = search;

    // Usando rota principal com instalação real
    return this.http.get<any>(`${this.apiUrl}`, { params });
  }

  /**
   * Obter detalhes de um pacote específico
   */
  getPackageDetails(packageId: string): Observable<PackageInfo> {
    return this.http.get<PackageInfo>(`${this.apiUrl}/${packageId}`);
  }

  /**
   * Instalar um pacote
   */
  installPackage(request: PackageInstallRequest): Observable<PackageActionResponse> {
    // Usando rota principal com instalação real
    return this.http.post<PackageActionResponse>(`${this.apiUrl}/install`, request);
  }

  /**
   * Remover um pacote
   */
  uninstallPackage(packageId: string): Observable<PackageActionResponse> {
    // Usando rota principal com remoção real
    return this.http.delete<PackageActionResponse>(`${this.apiUrl}/${packageId}`);
  }

  /**
   * Atualizar um pacote
   */
  updatePackage(packageId: string): Observable<PackageActionResponse> {
    // Usando rota principal com atualização real
    return this.http.post<PackageActionResponse>(`${this.apiUrl}/${packageId}/update`, {});
  }

  /**
   * Obter categorias de pacotes
   */
  getCategories(): Observable<{ id: string; name: string; count: number }[]> {
    // Usando rota principal
    return this.http.get<any>(`${this.apiUrl}/categories`);
  }

  /**
   * Verificar status de instalação de múltiplos pacotes
   */
  checkPackagesStatus(packageIds: string[]): Observable<Record<string, boolean>> {
    return this.http.post<Record<string, boolean>>(`${this.apiUrl}/status`, { packageIds });
  }

  /**
   * Obter informações sobre versões de um pacote de desenvolvimento
   */
  getPackageVersions(packageId: string): Observable<PackageVersionInfo> {
    return this.http.get<PackageVersionInfo>(`${this.apiUrl}/${packageId}/versions`);
  }

  /**
   * Instalar uma versão específica de um pacote
   */
  installPackageVersion(packageId: string, version: string): Observable<PackageActionResponse> {
    return this.http.post<PackageActionResponse>(`${this.apiUrl}/${packageId}/versions/${version}/install`, {});
  }

  /**
   * Definir a versão padrão de um pacote
   */
  setDefaultPackageVersion(packageId: string, version: string): Observable<PackageActionResponse> {
    return this.http.post<PackageActionResponse>(`${this.apiUrl}/${packageId}/versions/${version}/set-default`, {});
  }

  /**
   * Remover uma versão específica de um pacote
   */
  uninstallPackageVersion(packageId: string, version: string): Observable<PackageActionResponse> {
    return this.http.delete<PackageActionResponse>(`${this.apiUrl}/${packageId}/versions/${version}`);
  }
}
