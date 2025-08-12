import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container">
      <div class="page-header">
        <h2>⚙️ Gerenciamento de Serviços</h2>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Serviços do Sistema</h3>
        </div>
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>nginx</td>
                <td><span class="status-badge status-active">Ativo</span></td>
                <td>
                  <button class="btn btn-sm btn-warning">Reiniciar</button>
                  <button class="btn btn-sm btn-danger">Parar</button>
                </td>
              </tr>
              <tr>
                <td>mysql</td>
                <td><span class="status-badge status-active">Ativo</span></td>
                <td>
                  <button class="btn btn-sm btn-warning">Reiniciar</button>
                  <button class="btn btn-sm btn-danger">Parar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .module-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .page-header {
      margin-bottom: 30px;
      padding: 20px 0;
      border-bottom: 2px solid #e2e8f0;
    }
    .page-header h2 {
      margin: 0;
      color: #2d3748;
      font-size: 2rem;
      font-weight: 600;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.875rem;
      margin-right: 5px;
    }
  `]
})
export class ServicesComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}
