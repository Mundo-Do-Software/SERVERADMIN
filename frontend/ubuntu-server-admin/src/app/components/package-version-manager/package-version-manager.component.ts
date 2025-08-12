import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PackageService, PackageVersionInfo } from '../../services/package.service';

@Component({
  selector: 'app-package-version-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './package-version-manager.component.html',
  styleUrl: './package-version-manager.component.scss'
})
export class PackageVersionManagerComponent implements OnInit, OnChanges {
  @Input() packageId!: string;
  @Input() packageName!: string;
  @Input() isVisible = false;
  @Output() visibilityChange = new EventEmitter<boolean>();
  @Output() versionChanged = new EventEmitter<void>();

  versionInfo: PackageVersionInfo | null = null;
  loading = false;
  actionInProgress: { [key: string]: boolean } = {};
  errorMessage = '';
  successMessage = '';

  constructor(private packageService: PackageService) {}

  ngOnInit() {
    if (this.packageId && this.isVisible) {
      this.loadVersionInfo();
    }
  }

  ngOnChanges() {
    if (this.packageId && this.isVisible && !this.versionInfo) {
      this.loadVersionInfo();
    }
  }

  loadVersionInfo() {
    this.loading = true;
    this.errorMessage = '';
    
    this.packageService.getPackageVersions(this.packageId).subscribe({
      next: (info) => {
        this.versionInfo = info;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Erro ao carregar informações de versões';
        this.loading = false;
      }
    });
  }

  installVersion(version: string) {
    this.actionInProgress[`install-${version}`] = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.packageService.installPackageVersion(this.packageId, version).subscribe({
      next: (response) => {
        this.actionInProgress[`install-${version}`] = false;
        if (response.success) {
          this.successMessage = response.message;
          this.loadVersionInfo(); // Recarregar info
          this.versionChanged.emit();
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.actionInProgress[`install-${version}`] = false;
        this.errorMessage = error.error?.detail || 'Erro ao instalar versão';
      }
    });
  }

  setDefaultVersion(version: string) {
    this.actionInProgress[`default-${version}`] = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.packageService.setDefaultPackageVersion(this.packageId, version).subscribe({
      next: (response) => {
        this.actionInProgress[`default-${version}`] = false;
        if (response.success) {
          this.successMessage = response.message;
          this.loadVersionInfo(); // Recarregar info
          this.versionChanged.emit();
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.actionInProgress[`default-${version}`] = false;
        this.errorMessage = error.error?.detail || 'Erro ao definir versão padrão';
      }
    });
  }

  uninstallVersion(version: string) {
    if (!confirm(`Tem certeza que deseja remover a versão ${version} do ${this.packageName}?`)) {
      return;
    }

    this.actionInProgress[`uninstall-${version}`] = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.packageService.uninstallPackageVersion(this.packageId, version).subscribe({
      next: (response) => {
        this.actionInProgress[`uninstall-${version}`] = false;
        if (response.success) {
          this.successMessage = response.message;
          this.loadVersionInfo(); // Recarregar info
          this.versionChanged.emit();
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.actionInProgress[`uninstall-${version}`] = false;
        this.errorMessage = error.error?.detail || 'Erro ao remover versão';
      }
    });
  }

  isVersionInstalled(version: string): boolean {
    return this.versionInfo?.installedVersions.includes(version) || false;
  }

  isDefaultVersion(version: string): boolean {
    return this.versionInfo?.defaultVersion === version;
  }

  canUninstallVersion(version: string): boolean {
    return this.isVersionInstalled(version) && 
           this.versionInfo!.installedVersions.length > 1;
  }

  closeModal() {
    this.isVisible = false;
    this.visibilityChange.emit(false);
    this.versionInfo = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  getVersionManagerIcon(): string {
    if (!this.versionInfo) return '⚙️';
    
    switch (this.versionInfo.versionManager) {
      case 'nvm': return '💚';
      case 'dotnet': return '🔷';
      case 'manual': return '🛠️';
      default: return '⚙️';
    }
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
