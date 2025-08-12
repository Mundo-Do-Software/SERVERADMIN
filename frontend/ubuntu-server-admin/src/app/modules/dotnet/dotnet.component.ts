import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dotnet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container">
      <div class="page-header">
        <h2>⚡ .NET Core Management</h2>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>.NET Core Info</h3>
        </div>
        <div class="card-body">
          <p><strong>Versão:</strong> .NET 8.0</p>
          <p><strong>Status:</strong> <span class="status-badge status-active">Instalado</span></p>
          <button class="btn btn-primary">Deploy App</button>
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
export class DotnetComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}
