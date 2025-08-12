import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PackageService, PackageInfo } from '../../services/package.service';
import { PackageVersionManagerComponent } from '../../components/package-version-manager/package-version-manager.component';

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [CommonModule, FormsModule, PackageVersionManagerComponent],
  templateUrl: './packages.component.html',
  styleUrl: './packages.component.scss'
})
export class PackagesComponent implements OnInit {
  packages: PackageInfo[] = [];
  categories: { id: string; name: string; count: number }[] = [];
  filteredPackages: PackageInfo[] = [];
  
  // Paginação
  currentPage = 1;
  pageSize = 12;
  totalPackages = 0;
  totalPages = 0;
  
  // Filtros
  selectedCategory = '';
  searchTerm = '';
  showOnlyInstalled = false;
  
  // Estados
  loading = false;
  actionInProgress: { [key: string]: boolean } = {};

  // Gerenciamento de versões
  showVersionManager = false;
  selectedPackageId = '';
  selectedPackageName = '';

  constructor(
    private packageService: PackageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadPackages();
  }

  loadCategories() {
    this.packageService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Erro ao carregar categorias:', error);
      }
    });
  }

  loadPackages() {
    this.loading = true;
    this.packageService.getPackages(
      this.currentPage, 
      this.pageSize, 
      this.selectedCategory, 
      this.searchTerm
    ).subscribe({
      next: (response) => {
        this.packages = response.packages;
        this.totalPackages = response.total;
        this.totalPages = response.totalPages;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar pacotes:', error);
        this.loading = false;
      }
    });
  }

  applyFilters() {
    let filtered = [...this.packages];
    
    if (this.showOnlyInstalled) {
      filtered = filtered.filter(pkg => pkg.installed);
    }
    
    this.filteredPackages = filtered;
  }

  onCategoryChange() {
    this.currentPage = 1;
    this.loadPackages();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.loadPackages();
  }

  onShowInstalledChange() {
    this.applyFilters();
  }

  installPackage(packageInfo: PackageInfo) {
    if (this.actionInProgress[packageInfo.id]) return;
    
    this.actionInProgress[packageInfo.id] = true;
    
    this.packageService.installPackage({ packageId: packageInfo.id }).subscribe({
      next: (response) => {
        if (response.success) {
          // Recarregar a lista para obter o estado atualizado
          this.loadPackages();
        }
        this.actionInProgress[packageInfo.id] = false;
      },
      error: (error) => {
        console.error('Erro ao instalar pacote:', error);
        this.actionInProgress[packageInfo.id] = false;
      }
    });
  }

  uninstallPackage(packageInfo: PackageInfo) {
    if (this.actionInProgress[packageInfo.id]) return;
    
    if (!confirm(`Tem certeza que deseja remover ${packageInfo.name}?`)) {
      return;
    }
    
    this.actionInProgress[packageInfo.id] = true;
    
    this.packageService.uninstallPackage(packageInfo.id).subscribe({
      next: (response) => {
        if (response.success) {
          // Recarregar a lista para obter o estado atualizado
          this.loadPackages();
        }
        this.actionInProgress[packageInfo.id] = false;
      },
      error: (error) => {
        console.error('Erro ao remover pacote:', error);
        this.actionInProgress[packageInfo.id] = false;
      }
    });
  }

  updatePackage(packageInfo: PackageInfo) {
    if (this.actionInProgress[packageInfo.id]) return;
    
    this.actionInProgress[packageInfo.id] = true;
    
    this.packageService.updatePackage(packageInfo.id).subscribe({
      next: (response) => {
        if (response.success) {
          // Recarregar a lista para obter o estado atualizado
          this.loadPackages();
        }
        this.actionInProgress[packageInfo.id] = false;
      },
      error: (error) => {
        console.error('Erro ao atualizar pacote:', error);
        this.actionInProgress[packageInfo.id] = false;
      }
    });
  }

  openAdminPanel(packageInfo: PackageInfo) {
    if (packageInfo.hasAdminPanel && packageInfo.adminRoute) {
      this.router.navigate([packageInfo.adminRoute]);
    }
  }

  refreshPackages() {
    this.loadPackages();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadPackages();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPackages();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPackages();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages - 1);
    
    if (end - start < maxPages - 1) {
      start = Math.max(1, end - maxPages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getCategoryIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'database': '🗄️',
      'web': '🌐',
      'security': '🛡️',
      'development': '💻',
      'backup': '☁️',
      'system': '⚙️',
      'default': '📦'
    };
    
    return iconMap[category] || iconMap['default'];
  }

  getCategoryName(category: string): string {
    const nameMap: { [key: string]: string } = {
      'database': 'Banco de Dados',
      'web': 'Servidor Web',
      'security': 'Segurança',
      'development': 'Desenvolvimento',
      'backup': 'Backup',
      'system': 'Sistema',
      'default': 'Outros'
    };
    
    return nameMap[category] || nameMap['default'];
  }

  getInstalledCount(): number {
    return this.packages.filter(p => p.installed).length;
  }

  getUpdatesAvailableCount(): number {
    return this.packages.filter(p => 
      p.installed && p.hasUpdates
    ).length;
  }

  // Métodos para gerenciamento de versões
  supportsVersionManagement(pkg: PackageInfo): boolean {
    // Pacotes que suportam múltiplas versões
    const supportedPackages = ['php', 'nodejs', 'dotnet'];
    return supportedPackages.includes(pkg.id);
  }

  openVersionManager(pkg: PackageInfo): void {
    this.selectedPackageId = pkg.id;
    this.selectedPackageName = pkg.name;
    this.showVersionManager = true;
  }

  onVersionManagerVisibilityChange(visible: boolean): void {
    this.showVersionManager = visible;
    if (!visible) {
      this.selectedPackageId = '';
      this.selectedPackageName = '';
    }
  }

  onVersionChanged(): void {
    // Recarregar a lista de pacotes quando uma versão for alterada
    this.loadPackages();
  }
}
