import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="security-container">
      <div class="page-header">
        <h2>🔒 Segurança & Firewall</h2>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header">
            <h3>🔥 Status do Firewall</h3>
          </div>
          <div class="card-body">
            <div class="status-indicator">
              <span class="status-badge status-active">UFW Ativo</span>
            </div>
            <div class="security-actions">
              <button class="btn btn-warning">Desabilitar UFW</button>
              <button class="btn btn-primary">Configurar Regras</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>🛡️ SSH Security</h3>
          </div>
          <div class="card-body">
            <div class="security-settings">
              <p><strong>Porta SSH:</strong> 22</p>
              <p><strong>Root Login:</strong> <span class="status-badge status-warning">Habilitado</span></p>
              <p><strong>Autenticação por Chave:</strong> <span class="status-badge status-active">Habilitado</span></p>
            </div>
            <button class="btn btn-primary">Configurar SSH</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>📊 Log de Segurança</h3>
        </div>
        <div class="card-body">
          <div class="log-container">
            <div class="log-entry">
              <span class="log-time">10:30:15</span>
              <span class="log-message">Tentativa de login SSH falhada de 192.168.1.100</span>
            </div>
            <div class="log-entry">
              <span class="log-time">10:25:42</span>
              <span class="log-message">Regra de firewall aplicada: ALLOW 80/tcp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .security-container {
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

    .status-indicator {
      margin-bottom: 20px;
    }

    .security-actions {
      display: flex;
      gap: 10px;
    }

    .security-settings p {
      margin: 10px 0;
    }

    .log-container {
      max-height: 300px;
      overflow-y: auto;
      background: #f8fafc;
      border-radius: 8px;
      padding: 15px;
    }

    .log-entry {
      display: flex;
      gap: 15px;
      margin-bottom: 8px;
      padding: 8px;
      background: white;
      border-radius: 4px;
    }

    .log-time {
      color: #666;
      font-weight: 500;
      min-width: 80px;
    }
  `]
})
export class SecurityComponent implements OnInit {
  
  constructor() { }

  ngOnInit(): void {
  }
}
