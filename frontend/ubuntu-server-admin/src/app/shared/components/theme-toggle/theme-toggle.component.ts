import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../../shared/services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      class="theme-toggle-btn"
      (click)="toggleTheme()"
      [title]="currentTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
      aria-label="Toggle theme">
      <svg *ngIf="currentTheme === 'light'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <!-- Ícone da lua (modo escuro) -->
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <svg *ngIf="currentTheme === 'dark'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <!-- Ícone do sol (modo claro) -->
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    </button>
  `,
  styles: [`
    .theme-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--header-icon-color);
      cursor: pointer;
      transition: all var(--transition-fast);
      margin-left: var(--spacing-sm);
    }

    .theme-toggle-btn:hover {
      background: var(--header-icon-hover-bg);
      color: var(--header-icon-hover-color);
    }

    .theme-toggle-btn:focus {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .icon {
      width: 20px;
      height: 20px;
      stroke-width: 2;
    }
  `]
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  currentTheme: Theme = 'light';
  private subscription: Subscription = new Subscription();

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.themeService.currentTheme$.subscribe(theme => {
        this.currentTheme = theme;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
