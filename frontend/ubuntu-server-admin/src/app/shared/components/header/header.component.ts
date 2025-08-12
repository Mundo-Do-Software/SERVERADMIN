import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarService } from '../../../core/services/sidebar.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, ThemeToggleComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  breadcrumb: string = 'Dashboard';
  showNotifications = false;
  showSearchResults = false;
  showUserMenu = false;
  searchResults: any[] = [];
  notifications: any[] = [
    { id: 1, message: 'Sistema atualizado com sucesso', read: false, time: '5 min' },
    { id: 2, message: 'Backup realizado', read: true, time: '1h' }
  ];

  constructor(
    private sidebarService: SidebarService,
    private authService: AuthService,
    private router: Router
  ) {}

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  onSearch(query: string) {
    // Implementar busca
    console.log('Searching for:', query);
  }

  closeSearch() {
    this.showSearchResults = false;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getCurrentUsername(): string {
    const user = this.authService.getCurrentUser();
    return user?.username || 'Usuário';
  }

  getUserRole(): string {
    const user = this.authService.getCurrentUser();
    return user?.sudo ? 'Administrador' : 'Usuário';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
