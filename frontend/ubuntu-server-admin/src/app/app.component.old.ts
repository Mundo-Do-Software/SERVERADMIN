import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Ubuntu Server Admin';
  sidebarCollapsed = false;
  activeRoute = 'dashboard';

  private pageTitles: { [key: string]: string } = {
    'dashboard': 'Dashboard',
    'users': 'Gerenciamento de Usuários',
    'packages': 'Instalação de Pacotes',
    'security': 'Segurança & Firewall',
    'services': 'Gerenciamento de Serviços',
    'docker': 'Docker Management',
    'nginx': 'Nginx Configuration',
    'php': 'PHP Management',
    'node': 'Node.js Management',
    'dotnet': '.NET Core Management',
    'firewall': 'Firewall Configuration',
    'logs': 'System Logs'
  };

  constructor(private router: Router) {
    // Set initial route
    this.router.navigate(['/dashboard']);
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  setActiveRoute(route: string) {
    this.activeRoute = route;
  }

  getPageTitle(): string {
    return this.pageTitles[this.activeRoute] || 'Ubuntu Server Admin';
  }
}
               onmouseover="this.style.background='rgba(255,255,255,0.1)'"
               onmouseout="this.style.background='transparent'">
              🧪 Test
            </a>
          </nav>
        </div>
      </header>

      <!-- Main Content -->
      <main style="max-width: 1200px; margin: 0 auto; padding: 0;">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer style="background: #333; color: white; text-align: center; padding: 1rem; margin-top: 2rem;">
        <p style="margin: 0; font-size: 0.9rem;">Ubuntu Server Admin © 2025 - Full Stack with Angular & FastAPI</p>
      </footer>
    </div>
  `
})
export class AppComponent {
  title = 'Ubuntu Server Admin';
}
