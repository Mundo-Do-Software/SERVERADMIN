import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SecurityService, FirewallStatus, FirewallRule, NewFirewallRule, Fail2BanStatus, BannedIP } from '../../services/security.service';

@Component({
  selector: 'app-firewall',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="module-container">
      <div class="page-header">
        <h2>🔒 Security Administration</h2>
        <p>Manage firewall rules and intrusion prevention</p>
      </div>

      <!-- Firewall Section -->
      <div class="card">
        <div class="card-header">
          <h3>🔥 UFW Firewall</h3>
          <div class="status-badge" [class.active]="firewallStatus?.active" [class.inactive]="!firewallStatus?.active">
            {{ firewallStatus?.active ? 'ACTIVE' : 'INACTIVE' }}
          </div>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Status</span>
              <span class="stat-value" [class.active]="firewallStatus?.active">
                {{ firewallStatus?.active ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Active Rules</span>
              <span class="stat-value">{{ firewallStatus?.rules_count || 0 }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <button 
              class="btn btn-success" 
              (click)="enableFirewall()"
              [disabled]="firewallStatus?.active">
              Enable Firewall
            </button>
            <button 
              class="btn btn-warning" 
              (click)="disableFirewall()"
              [disabled]="!firewallStatus?.active">
              Disable Firewall
            </button>
            <button 
              class="btn btn-danger" 
              (click)="resetFirewall()">
              Reset All Rules
            </button>
            <button class="btn btn-primary" (click)="refreshFirewallData()">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- Add Firewall Rule -->
      <div class="card">
        <div class="card-header">
          <h3>➕ Add Firewall Rule</h3>
        </div>
        <div class="card-body">
          <form [formGroup]="firewallRuleForm" (ngSubmit)="addFirewallRule()">
            <div class="form-grid">
              <div class="form-group">
                <label>Action</label>
                <select formControlName="action" class="form-control">
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                  <option value="reject">Reject</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Port</label>
                <input 
                  type="text" 
                  formControlName="port" 
                  class="form-control" 
                  placeholder="80, 443, 22, etc.">
              </div>
              
              <div class="form-group">
                <label>Protocol</label>
                <select formControlName="protocol" class="form-control">
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="any">Any</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Direction</label>
                <select formControlName="direction" class="form-control">
                  <option value="in">Incoming</option>
                  <option value="out">Outgoing</option>
                  <option value="both">Both</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Source IP (optional)</label>
                <input 
                  type="text" 
                  formControlName="source" 
                  class="form-control" 
                  placeholder="192.168.1.0/24 or specific IP">
              </div>
            </div>
            
            <button type="submit" class="btn btn-primary" [disabled]="firewallRuleForm.invalid">
              Add Rule
            </button>
          </form>
        </div>
      </div>

      <!-- Firewall Rules List -->
      <div class="card">
        <div class="card-header">
          <h3>📋 Current Firewall Rules</h3>
        </div>
        <div class="card-body">
          <div class="table-container" *ngIf="firewallRules.length > 0; else noRules">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action</th>
                  <th>Direction</th>
                  <th>Rule Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let rule of firewallRules">
                  <td>{{ rule.number }}</td>
                  <td>
                    <span class="action-badge" [class]="rule.action.toLowerCase()">
                      {{ rule.action }}
                    </span>
                  </td>
                  <td>{{ rule.direction }}</td>
                  <td class="rule-details">{{ rule.rule }}</td>
                  <td>
                    <button 
                      class="btn btn-sm btn-danger" 
                      (click)="deleteFirewallRule(rule.number)">
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noRules>
            <p class="no-data">No firewall rules configured</p>
          </ng-template>
        </div>
      </div>

      <!-- Fail2Ban Section -->
      <div class="card">
        <div class="card-header">
          <h3>🛡️ Fail2Ban Intrusion Prevention</h3>
          <div class="status-badge" [class.active]="fail2banStatus?.active" [class.inactive]="!fail2banStatus?.active">
            {{ fail2banStatus?.active ? 'ACTIVE' : 'INACTIVE' }}
          </div>
        </div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Service Status</span>
              <span class="stat-value" [class.active]="fail2banStatus?.active">
                {{ fail2banStatus?.active ? 'Running' : 'Stopped' }}
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Active Jails</span>
              <span class="stat-value">{{ fail2banStatus?.jails?.length || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Banned IPs</span>
              <span class="stat-value">{{ fail2banStatus?.banned_ips || 0 }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <button 
              class="btn btn-success" 
              (click)="fail2banServiceAction('start')"
              [disabled]="fail2banStatus?.active">
              Start Service
            </button>
            <button 
              class="btn btn-warning" 
              (click)="fail2banServiceAction('stop')"
              [disabled]="!fail2banStatus?.active">
              Stop Service
            </button>
            <button 
              class="btn btn-info" 
              (click)="fail2banServiceAction('restart')">
              Restart Service
            </button>
            <button class="btn btn-primary" (click)="refreshFail2BanData()">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- Fail2Ban Jails -->
      <div class="card" *ngIf="fail2banStatus && fail2banStatus.jails && fail2banStatus.jails.length > 0">
        <div class="card-header">
          <h3>🏛️ Fail2Ban Jails</h3>
        </div>
        <div class="card-body">
          <div class="jails-grid">
            <div class="jail-card" *ngFor="let jail of fail2banStatus!.jails">
              <div class="jail-header">
                <h4>{{ jail.name }}</h4>
                <span class="status-indicator" [class.enabled]="jail.enabled">
                  {{ jail.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              <div class="jail-stats">
                <div class="jail-stat">
                  <span class="label">Currently Failed:</span>
                  <span class="value">{{ jail.currently_failed }}</span>
                </div>
                <div class="jail-stat">
                  <span class="label">Total Failed:</span>
                  <span class="value">{{ jail.total_failed }}</span>
                </div>
                <div class="jail-stat">
                  <span class="label">Currently Banned:</span>
                  <span class="value warning">{{ jail.currently_banned }}</span>
                </div>
                <div class="jail-stat">
                  <span class="label">Total Banned:</span>
                  <span class="value">{{ jail.total_banned }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Banned IPs -->
      <div class="card">
        <div class="card-header">
          <h3>🚫 Banned IP Addresses</h3>
          <button class="btn btn-primary" (click)="refreshBannedIPs()">
            🔄 Refresh
          </button>
        </div>
        <div class="card-body">
          <div class="table-container" *ngIf="bannedIPs.length > 0; else noBannedIPs">
            <table class="table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Jail</th>
                  <th>Banned At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let bannedIP of bannedIPs">
                  <td class="ip-address">{{ bannedIP.ip }}</td>
                  <td>{{ bannedIP.jail }}</td>
                  <td>{{ bannedIP.banned_at }}</td>
                  <td>
                    <button 
                      class="btn btn-sm btn-success" 
                      (click)="unbanIP(bannedIP.ip, bannedIP.jail)">
                      🔓 Unban
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noBannedIPs>
            <p class="no-data">No IP addresses currently banned</p>
          </ng-template>
        </div>
      </div>

      <!-- Messages -->
      <div class="alert alert-success" *ngIf="successMessage">
        {{ successMessage }}
      </div>
      <div class="alert alert-danger" *ngIf="errorMessage">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .module-container { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: var(--spacing-lg); 
      background: var(--bg-primary);
      min-height: calc(100vh - var(--header-height));
    }
    
    .page-header { 
      margin-bottom: var(--spacing-2xl); 
      padding: var(--spacing-lg) 0; 
      border-bottom: 2px solid var(--border-color); 
    }
    .page-header h2 { 
      margin: 0; 
      color: var(--text-primary); 
      font-size: var(--font-3xl); 
      font-weight: 600; 
    }
    .page-header p { 
      margin: var(--spacing-xs) 0 0 0; 
      color: var(--text-secondary); 
      font-size: var(--font-base);
    }
    
    .card { 
      background: var(--card-bg); 
      border: 1px solid var(--card-border);
      border-radius: var(--radius-md); 
      box-shadow: var(--card-shadow); 
      margin-bottom: var(--spacing-lg); 
      transition: box-shadow var(--transition-fast);
    }
    .card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .card-header { 
      padding: var(--spacing-lg); 
      border-bottom: 1px solid var(--border-color); 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
    }
    .card-header h3 { 
      margin: 0; 
      color: var(--text-primary); 
      font-size: var(--font-xl); 
      font-weight: 600;
    }
    .card-body { 
      padding: var(--spacing-lg); 
    }
    
    .status-badge {
      padding: var(--spacing-xs) var(--spacing-md);
      border-radius: var(--radius-full);
      font-size: var(--font-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-badge.active { 
      background: var(--status-online); 
      color: var(--text-inverse); 
    }
    .status-badge.inactive { 
      background: var(--status-offline); 
      color: var(--text-inverse); 
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      padding: var(--spacing-lg);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
    }
    .stat-item:hover {
      background: var(--bg-tertiary);
    }
    .stat-label { 
      font-size: var(--font-sm); 
      color: var(--text-secondary); 
      margin-bottom: var(--spacing-xs); 
      font-weight: 500;
    }
    .stat-value { 
      font-size: var(--font-2xl); 
      font-weight: 600; 
      color: var(--text-primary); 
    }
    .stat-value.active { 
      color: var(--status-online); 
    }
    
    .action-buttons {
      display: flex;
      gap: var(--spacing-md);
      flex-wrap: wrap;
    }
    
    .btn {
      padding: var(--spacing-sm) var(--spacing-md);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-weight: 500;
      font-size: var(--font-sm);
      transition: all var(--transition-fast);
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
    }
    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .btn:disabled { 
      opacity: 0.5; 
      cursor: not-allowed; 
      transform: none !important;
    }
    .btn-primary { 
      background: var(--btn-primary); 
      color: var(--text-inverse); 
    }
    .btn-primary:hover:not(:disabled) { 
      background: var(--btn-primary-hover); 
    }
    .btn-success { 
      background: var(--btn-success); 
      color: var(--text-inverse); 
    }
    .btn-success:hover:not(:disabled) { 
      background: var(--btn-success-hover); 
    }
    .btn-warning { 
      background: var(--btn-warning); 
      color: var(--text-inverse); 
    }
    .btn-warning:hover:not(:disabled) { 
      background: var(--btn-warning-hover); 
    }
    .btn-danger { 
      background: var(--btn-danger); 
      color: var(--text-inverse); 
    }
    .btn-danger:hover:not(:disabled) { 
      background: var(--btn-danger-hover); 
    }
    .btn-info { 
      background: var(--info-color); 
      color: var(--text-inverse); 
    }
    .btn-info:hover:not(:disabled) { 
      background: #0891b2; 
    }
    .btn-sm { 
      padding: var(--spacing-xs) var(--spacing-sm); 
      font-size: var(--font-xs); 
    }
    
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }
    .form-group {
      display: flex;
      flex-direction: column;
    }
    .form-group label {
      margin-bottom: var(--spacing-xs);
      color: var(--text-primary);
      font-weight: 500;
      font-size: var(--font-sm);
    }
    .form-control {
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--input-border);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      background: var(--input-bg);
      color: var(--input-text);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .form-control::placeholder {
      color: var(--input-placeholder);
    }
    .form-control:focus {
      outline: none;
      border-color: var(--input-border-focus);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .table-container { 
      overflow-x: auto; 
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
    }
    .table { 
      width: 100%; 
      border-collapse: collapse; 
    }
    .table th,
    .table td { 
      padding: var(--spacing-md); 
      text-align: left; 
      border-bottom: 1px solid var(--border-color); 
    }
    .table th { 
      background: var(--bg-secondary); 
      font-weight: 600; 
      color: var(--text-primary);
      font-size: var(--font-sm);
    }
    .table td {
      color: var(--text-primary);
      font-size: var(--font-sm);
    }
    .table tr:hover {
      background: var(--bg-secondary);
    }
    
    .action-badge {
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-md);
      font-size: var(--font-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .action-badge.allow { 
      background: rgba(16, 185, 129, 0.1); 
      color: var(--success-color); 
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .action-badge.deny { 
      background: rgba(239, 68, 68, 0.1); 
      color: var(--error-color); 
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .action-badge.reject { 
      background: rgba(245, 158, 11, 0.1); 
      color: var(--warning-color); 
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    
    .rule-details { 
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace; 
      font-size: var(--font-xs); 
      color: var(--text-secondary);
      background: var(--bg-secondary);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
    }
    
    .jails-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--spacing-lg);
    }
    .jail-card {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
      background: var(--bg-secondary);
      transition: all var(--transition-fast);
    }
    .jail-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .jail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
    }
    .jail-header h4 { 
      margin: 0; 
      color: var(--text-primary); 
      font-size: var(--font-lg);
    }
    .status-indicator {
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-md);
      font-size: var(--font-xs);
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-indicator.enabled { 
      background: rgba(16, 185, 129, 0.1); 
      color: var(--success-color); 
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .status-indicator:not(.enabled) { 
      background: rgba(239, 68, 68, 0.1); 
      color: var(--error-color); 
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    .jail-stats { 
      display: flex; 
      flex-direction: column; 
      gap: var(--spacing-sm); 
    }
    .jail-stat { 
      display: flex; 
      justify-content: space-between; 
      padding: var(--spacing-xs) 0;
      border-bottom: 1px solid var(--border-light);
    }
    .jail-stat .label { 
      color: var(--text-secondary); 
      font-size: var(--font-sm); 
    }
    .jail-stat .value { 
      font-weight: 600; 
      color: var(--text-primary); 
      font-size: var(--font-sm);
    }
    .jail-stat .value.warning { 
      color: var(--error-color); 
    }
    
    .ip-address { 
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace; 
      font-weight: 600; 
      color: var(--text-primary);
      background: var(--bg-secondary);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
    }
    
    .no-data {
      text-align: center;
      color: var(--text-muted);
      font-style: italic;
      padding: var(--spacing-2xl);
      font-size: var(--font-base);
    }
    
    .alert {
      padding: var(--spacing-md) var(--spacing-lg);
      border-radius: var(--radius-md);
      margin: var(--spacing-lg) 0;
      border-left: 4px solid;
      font-size: var(--font-sm);
    }
    .alert-success { 
      background: rgba(16, 185, 129, 0.1); 
      color: var(--success-color); 
      border-left-color: var(--success-color);
    }
    .alert-danger { 
      background: rgba(239, 68, 68, 0.1); 
      color: var(--error-color); 
      border-left-color: var(--error-color);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .module-container {
        padding: var(--spacing-md);
      }
      .form-grid {
        grid-template-columns: 1fr;
      }
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .jails-grid {
        grid-template-columns: 1fr;
      }
      .action-buttons {
        flex-direction: column;
      }
      .btn {
        justify-content: center;
      }
    }

    /* Dark theme specific adjustments */
    [data-theme="dark"] .jail-card {
      background: var(--bg-tertiary);
    }
    
    [data-theme="dark"] .stat-item {
      background: var(--bg-tertiary);
    }
    
    [data-theme="dark"] .rule-details {
      background: var(--bg-tertiary);
    }
    
    [data-theme="dark"] .ip-address {
      background: var(--bg-tertiary);
    }
  `]
})
export class FirewallComponent implements OnInit {
  firewallStatus: FirewallStatus | null = null;
  firewallRules: FirewallRule[] = [];
  fail2banStatus: Fail2BanStatus | null = null;
  bannedIPs: BannedIP[] = [];
  
  firewallRuleForm: FormGroup;
  successMessage = '';
  errorMessage = '';

  constructor(
    private securityService: SecurityService,
    private fb: FormBuilder
  ) {
    this.firewallRuleForm = this.fb.group({
      action: ['allow', Validators.required],
      port: ['', [Validators.required]],
      protocol: ['tcp'],
      direction: ['in'],
      source: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.refreshFirewallData();
    this.refreshFail2BanData();
    this.refreshBannedIPs();
  }

  refreshFirewallData(): void {
    this.securityService.getFirewallStatus().subscribe({
      next: (status) => {
        this.firewallStatus = status;
      },
      error: (error) => {
        this.showError('Erro ao carregar status do firewall');
      }
    });

    this.securityService.getFirewallRules().subscribe({
      next: (rules) => {
        this.firewallRules = rules;
      },
      error: (error) => {
        this.showError('Erro ao carregar regras do firewall');
      }
    });
  }

  refreshFail2BanData(): void {
    this.securityService.getFail2BanStatus().subscribe({
      next: (status) => {
        this.fail2banStatus = status;
      },
      error: (error) => {
        this.showError('Erro ao carregar status do Fail2Ban');
      }
    });
  }

  refreshBannedIPs(): void {
    this.securityService.getBannedIPs().subscribe({
      next: (ips) => {
        this.bannedIPs = ips;
      },
      error: (error) => {
        this.showError('Erro ao carregar IPs banidos');
      }
    });
  }

  addFirewallRule(): void {
    if (this.firewallRuleForm.valid) {
      const rule: NewFirewallRule = this.firewallRuleForm.value;
      
      this.securityService.addFirewallRule(rule).subscribe({
        next: (response) => {
          this.showSuccess('Regra do firewall adicionada com sucesso!');
          this.firewallRuleForm.reset();
          this.firewallRuleForm.patchValue({
            action: 'allow',
            protocol: 'tcp',
            direction: 'in'
          });
          this.refreshFirewallData();
        },
        error: (error) => {
          this.showError('Erro ao adicionar regra do firewall');
        }
      });
    }
  }

  deleteFirewallRule(ruleNumber: number): void {
    if (confirm(`Tem certeza que deseja remover a regra #${ruleNumber}?`)) {
      this.securityService.deleteFirewallRule(ruleNumber).subscribe({
        next: (response) => {
          this.showSuccess('Regra removida com sucesso!');
          this.refreshFirewallData();
        },
        error: (error) => {
          this.showError('Erro ao remover regra do firewall');
        }
      });
    }
  }

  enableFirewall(): void {
    this.securityService.enableFirewall().subscribe({
      next: (response) => {
        this.showSuccess('Firewall habilitado com sucesso!');
        this.refreshFirewallData();
      },
      error: (error) => {
        this.showError('Erro ao habilitar firewall');
      }
    });
  }

  disableFirewall(): void {
    if (confirm('Tem certeza que deseja desabilitar o firewall? Isso pode deixar o servidor vulnerável.')) {
      this.securityService.disableFirewall().subscribe({
        next: (response) => {
          this.showSuccess('Firewall desabilitado!');
          this.refreshFirewallData();
        },
        error: (error) => {
          this.showError('Erro ao desabilitar firewall');
        }
      });
    }
  }

  resetFirewall(): void {
    if (confirm('ATENÇÃO: Isso irá remover TODAS as regras do firewall. Tem certeza?')) {
      this.securityService.resetFirewall().subscribe({
        next: (response) => {
          this.showSuccess('Firewall resetado com sucesso!');
          this.refreshFirewallData();
        },
        error: (error) => {
          this.showError('Erro ao resetar firewall');
        }
      });
    }
  }

  unbanIP(ip: string, jail: string): void {
    this.securityService.unbanIP(ip, jail).subscribe({
      next: (response) => {
        this.showSuccess(`IP ${ip} foi desbanido com sucesso!`);
        this.refreshBannedIPs();
        this.refreshFail2BanData();
      },
      error: (error) => {
        this.showError(`Erro ao desbanir IP ${ip}`);
      }
    });
  }

  fail2banServiceAction(action: 'start' | 'stop' | 'restart' | 'reload'): void {
    this.securityService.fail2banServiceAction(action).subscribe({
      next: (response) => {
        this.showSuccess(`Serviço Fail2Ban ${action} executado com sucesso!`);
        setTimeout(() => this.refreshFail2BanData(), 2000);
      },
      error: (error) => {
        this.showError(`Erro ao executar ${action} no Fail2Ban`);
      }
    });
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 5000);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 5000);
  }
}
