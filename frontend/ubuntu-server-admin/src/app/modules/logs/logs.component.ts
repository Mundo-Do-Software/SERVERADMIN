import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container">
      <div class="page-header">
        <h2>📄 System Logs</h2>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Recent Logs</h3>
        </div>
        <div class="card-body">
          <div class="log-container">
            <div class="log-entry">
              <span class="log-time">10:30:15</span>
              <span class="log-message">System startup completed</span>
            </div>
            <div class="log-entry">
              <span class="log-time">10:25:42</span>
              <span class="log-message">SSH connection from 192.168.1.100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .module-container { max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 30px; padding: 20px 0; border-bottom: 2px solid #e2e8f0; }
    .page-header h2 { margin: 0; color: #2d3748; font-size: 2rem; font-weight: 600; }
    .log-container { max-height: 400px; overflow-y: auto; background: #f8fafc; border-radius: 8px; padding: 15px; }
    .log-entry { display: flex; gap: 15px; margin-bottom: 8px; }
    .log-time { color: #666; font-weight: 500; min-width: 80px; }
  `]
})
export class LogsComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}
