import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../../core/services/sidebar.service';
import { PackageService, PackageInfo } from '../../../services/package.service';
import { Observable, map } from 'rxjs';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  isBottom?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  isCollapsed: Observable<boolean>;
  openSubmenus: Set<string> = new Set();
  installedPackagesWithAdmin: MenuItem[] = [];

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'fas fa-tachometer-alt',
      route: '/dashboard'
    },
    {
      label: 'Sistema',
      icon: 'fas fa-server',
      children: [
        { label: 'Informações', icon: 'fas fa-info-circle', route: '/system/info' },
        { label: 'Recursos', icon: 'fas fa-chart-line', route: '/system/resources' },
        { label: 'Logs', icon: 'fas fa-file-alt', route: '/system/logs' }
      ]
    },
    {
      label: 'Usuários',
      icon: 'fas fa-users',
      route: '/users'
    },
    {
      label: 'Serviços',
      icon: 'fas fa-cogs',
      route: '/services'
    },
    {
      label: 'Pacotes',
      icon: 'fas fa-box',
      route: '/packages'
    },
    {
      label: 'Rede',
      icon: 'fas fa-network-wired',
      route: '/network'
    },
    {
      label: 'Segurança',
      icon: 'fas fa-shield-alt',
      children: [
        { label: 'Firewall', icon: 'fas fa-fire', route: '/security/firewall' },
        { label: 'SSH', icon: 'fas fa-key', route: '/security/ssh' }
      ]
    }
  ];

  bottomMenuItems: MenuItem[] = [
    {
      label: 'Configurações',
      icon: 'fas fa-cog',
      route: '/settings',
      isBottom: true
    },
    {
      label: 'Sair',
      icon: 'fas fa-sign-out-alt',
      route: '/logout',
      isBottom: true
    }
  ];

  constructor(
    private sidebarService: SidebarService,
    private packageService: PackageService
  ) {
    this.isCollapsed = this.sidebarService.isCollapsed$;
  }

  ngOnInit() {
    console.log('SidebarComponent ngOnInit called');
    this.loadInstalledPackagesWithAdmin();
  }

  private loadInstalledPackagesWithAdmin() {
    console.log('Loading installed packages with admin panels...');
    this.packageService.getPackages(1, 100).subscribe({
      next: (response) => {
        console.log('Packages response:', response);
        const installedWithAdmin = response.packages
          .filter(pkg => {
            console.log(`Package ${pkg.id}: installed=${pkg.installed}, hasAdminPanel=${pkg.hasAdminPanel}, adminRoute=${pkg.adminRoute}`);
            return pkg.installed && pkg.hasAdminPanel && pkg.adminRoute;
          })
          .map(pkg => ({
            label: pkg.name,
            icon: this.getPackageIcon(pkg.id),
            route: pkg.adminRoute
          }));

        console.log('Filtered packages with admin:', installedWithAdmin);
        // Atualizar o item "Pacotes" para incluir os submenus
        this.updatePackagesMenuItem(installedWithAdmin);
      },
      error: (error) => {
        console.error('Erro ao carregar pacotes instalados:', error);
      }
    });
  }

  private getPackageIcon(packageId: string): string {
    const iconMap: { [key: string]: string } = {
      'mysql-server': 'fas fa-database',
      'postgresql': 'fas fa-database',
      'nginx': 'fas fa-server',
      'apache2': 'fas fa-server',
      'redis-server': 'fas fa-memory',
      'docker': 'fab fa-docker',
      'grafana': 'fas fa-chart-line',
      'prometheus': 'fas fa-chart-area',
      'jenkins': 'fas fa-tools',
      'gitlab': 'fab fa-gitlab',
      'nextcloud': 'fas fa-cloud',
      'wordpress': 'fab fa-wordpress',
      'phpmyadmin': 'fas fa-database',
      'adminer': 'fas fa-database',
      'portainer': 'fab fa-docker',
      'webmin': 'fas fa-cogs'
    };
    
    return iconMap[packageId] || 'fas fa-cube';
  }

  private updatePackagesMenuItem(installedPackages: MenuItem[]) {
    console.log('Updating packages menu item with:', installedPackages);
    const packagesIndex = this.menuItems.findIndex(item => item.label === 'Pacotes');
    console.log('Packages menu index:', packagesIndex);
    
    if (packagesIndex !== -1) {
      const newPackagesItem = {
        label: 'Pacotes',
        icon: 'fas fa-box',
        children: [
          { label: 'Gerenciar Pacotes', icon: 'fas fa-list', route: '/packages' },
          ...installedPackages.length > 0 ? [
            { label: '─────────────', icon: '', route: '' }, // Separador visual
            ...installedPackages
          ] : []
        ]
      };
      
      this.menuItems[packagesIndex] = newPackagesItem;
      console.log('Updated menuItems:', this.menuItems);
    }
  }

  toggleSubmenu(label: string) {
    if (this.openSubmenus.has(label)) {
      this.openSubmenus.delete(label);
    } else {
      this.openSubmenus.add(label);
    }
  }

  isSubmenuOpen(label: string): boolean {
    return this.openSubmenus.has(label);
  }
}
