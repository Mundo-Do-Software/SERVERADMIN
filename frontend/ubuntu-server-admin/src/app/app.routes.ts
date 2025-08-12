import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login-page.component').then(m => m.LoginPageComponent),
    canActivate: [loginGuard]
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/premium-dashboard.component').then(m => m.PremiumDashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'packages',
        loadComponent: () => import('./pages/packages/packages.component').then(m => m.PackagesComponent)
      },
      // Componentes de administração de pacotes específicos (devem vir ANTES da rota genérica)
      {
        path: 'packages/mysql-server',
        loadComponent: () => import('./modules/packages/mysql/mysql.component').then(m => m.MysqlComponent)
      },
      {
        path: 'packages/nginx',
        loadComponent: () => import('./modules/packages/nginx/nginx.component').then(m => m.NginxComponent)
      },
      {
        path: 'packages/php',
        loadComponent: () => import('./modules/packages/php/php.component').then(m => m.PhpComponent)
      },
      {
        path: 'packages/:id',
        loadComponent: () => import('./modules/packages/admin/package-admin.component').then(m => m.PackageAdminComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesComponent)
      },
      {
        path: 'system',
        loadComponent: () => import('./pages/system/system.component').then(m => m.SystemComponent)
      },
      {
        path: 'network',
        loadComponent: () => import('./pages/network/network.component').then(m => m.NetworkComponent)
      },
      {
        path: 'security',
        loadComponent: () => import('./modules/security/security.component').then(m => m.SecurityComponent)
      },
      {
        path: 'firewall',
        loadComponent: () => import('./modules/firewall/firewall.component').then(m => m.FirewallComponent)
      },
      {
        path: 'logs',
        loadComponent: () => import('./modules/logs/logs.component').then(m => m.LogsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
