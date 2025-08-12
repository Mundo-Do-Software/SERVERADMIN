import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentThemeSubject = new BehaviorSubject<Theme>('light');
  public currentTheme$ = this.currentThemeSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadTheme();
    }
  }

  private loadTheme(): void {
    // Verifica se há um tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    
    // Se não há tema salvo, verifica a preferência do sistema
    if (!savedTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    } else {
      this.setTheme(savedTheme);
    }
  }

  public setTheme(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) {
      const htmlElement = document.documentElement;
      
      if (theme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
      } else {
        htmlElement.removeAttribute('data-theme');
      }

      // Salva a preferência no localStorage
      localStorage.setItem('theme', theme);
      this.currentThemeSubject.next(theme);
    }
  }

  public toggleTheme(): void {
    const currentTheme = this.currentThemeSubject.value;
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  public getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  public isDarkMode(): boolean {
    return this.currentThemeSubject.value === 'dark';
  }

  public isLightMode(): boolean {
    return this.currentThemeSubject.value === 'light';
  }
}
