import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nginx',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container">
      <div class="page-header">
        <h2>🌐 Nginx Configuration</h2>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Virtual Hosts</h3>
        </div>
        <div class="card-body">
          <p>Configure seus virtual hosts do Nginx</p>
          <button class="btn btn-primary">Adicionar Site</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .module-container { max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 30px; padding: 20px 0; border-bottom: 2px solid #e2e8f0; }
    .page-header h2 { margin: 0; color: #2d3748; font-size: 2rem; font-weight: 600; }
  `]
})
export class NginxComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}
