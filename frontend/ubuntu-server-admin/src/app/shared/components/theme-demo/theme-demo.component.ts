import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="demo-container">
      <h2>Demonstração do Sistema de Temas</h2>
      <p>Tema atual: <strong>{{ currentTheme }}</strong></p>
      
      <div class="button-group">
        <button (click)="toggleTheme()" class="demo-btn">
          Alternar Tema ({{ currentTheme === 'light' ? 'Para Escuro' : 'Para Claro' }})
        </button>
        <button (click)="setLightTheme()" class="demo-btn">Tema Claro</button>
        <button (click)="setDarkTheme()" class="demo-btn">Tema Escuro</button>
      </div>

      <div class="demo-cards">
        <div class="demo-card">
          <h3>Card de Demonstração</h3>
          <p>Este card usa as variáveis CSS do tema atual.</p>
          <p>Cores de fundo, texto e bordas se adaptam automaticamente.</p>
        </div>
        
        <div class="demo-card">
          <h3>Outro Card</h3>
          <p>Teste as cores primary, secondary e de fundo.</p>
          <button class="card-btn">Botão Exemplo</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .demo-container {
      padding: var(--spacing-lg);
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 400px;
    }

    h2 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
    }

    p {
      color: var(--text-secondary);
      margin-bottom: var(--spacing-md);
    }

    .button-group {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-xl);
      flex-wrap: wrap;
    }

    .demo-btn {
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--btn-primary);
      color: var(--text-inverse);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .demo-btn:hover {
      background: var(--btn-primary-hover);
      transform: translateY(-1px);
    }

    .demo-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--spacing-lg);
    }

    .demo-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      box-shadow: var(--card-shadow);
      transition: all var(--transition-normal);
    }

    .demo-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .demo-card h3 {
      color: var(--text-primary);
      margin-bottom: var(--spacing-sm);
    }

    .demo-card p {
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .card-btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 1px solid var(--primary-color);
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--primary-color);
      cursor: pointer;
      transition: all var(--transition-fast);
      margin-top: var(--spacing-sm);
    }

    .card-btn:hover {
      background: var(--primary-color);
      color: var(--text-inverse);
    }
  `]
})
export class ThemeDemoComponent implements OnInit {
  currentTheme: Theme = 'light';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.currentTheme$.subscribe((theme: Theme) => {
      this.currentTheme = theme;
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setLightTheme(): void {
    this.themeService.setTheme('light');
  }

  setDarkTheme(): void {
    this.themeService.setTheme('dark');
  }
}
