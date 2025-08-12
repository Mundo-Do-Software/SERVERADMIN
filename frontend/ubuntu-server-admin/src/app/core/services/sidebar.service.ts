import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private collapsed = new BehaviorSubject<boolean>(false);
  private isMobile = new BehaviorSubject<boolean>(window.innerWidth <= 768);
  private isOpen = new BehaviorSubject<boolean>(false);

  isCollapsed$ = this.collapsed.asObservable();
  isMobile$ = this.isMobile.asObservable();
  isOpen$ = this.isOpen.asObservable();

  constructor() {
    this.setupWindowResize();
  }

  private setupWindowResize() {
    window.addEventListener('resize', () => {
      this.isMobile.next(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        this.isOpen.next(false);
      }
    });
  }

  toggle() {
    if (this.isMobile.value) {
      this.isOpen.next(!this.isOpen.value);
    } else {
      this.collapsed.next(!this.collapsed.value);
    }
  }

  closeMobileMenu() {
    if (this.isMobile.value) {
      this.isOpen.next(false);
    }
  }
}
