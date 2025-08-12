import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-docker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container">
      <div class="page-header">
        <h2>🐳 Docker Management</h2>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header">
            <h3>Containers</h3>
          </div>
          <div class="card-body">
            <p>3 containers rodando</p>
            <button class="btn btn-primary">Ver Containers</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Images</h3>
          </div>
          <div class="card-body">
            <p>12 imagens disponíveis</p>
            <button class="btn btn-primary">Gerenciar Imagens</button>
          </div>
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
export class DockerComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}
