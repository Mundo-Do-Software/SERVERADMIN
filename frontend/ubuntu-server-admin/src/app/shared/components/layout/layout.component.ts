import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';
import { Observable } from 'rxjs';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  standalone: true,
  selector: 'app-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    SidebarComponent,
    FooterComponent
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  sidebarCollapsed$: Observable<boolean>;
  isMobileOpen$: Observable<boolean>;
  isMobile$: Observable<boolean>;

  constructor(private sidebarService: SidebarService) {
    this.sidebarCollapsed$ = this.sidebarService.isCollapsed$;
    this.isMobileOpen$ = this.sidebarService.isOpen$;
    this.isMobile$ = this.sidebarService.isMobile$;
  }

  closeMobileMenu() {
    this.sidebarService.closeMobileMenu();
  }
}
