import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FirewallStatus {
  active: boolean;
  rules_count: number;
  status_output: string;
}

export interface FirewallRule {
  number: number;
  action: string;
  direction: string;
  rule: string;
  raw: string;
}

export interface Fail2BanStatus {
  active: boolean;
  jails: Fail2BanJail[];
  banned_ips: number;
}

export interface Fail2BanJail {
  name: string;
  currently_failed: number;
  total_failed: number;
  currently_banned: number;
  total_banned: number;
  enabled: boolean;
}

export interface BannedIP {
  ip: string;
  jail: string;
  banned_at: string;
}

export interface NewFirewallRule {
  action: string;
  port: string | number;
  protocol?: string;
  direction?: string;
  source?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private apiUrl = `${environment.apiUrl}/security`;

  constructor(private http: HttpClient) { }

  // FIREWALL METHODS
  getFirewallStatus(): Observable<FirewallStatus> {
    return this.http.get<FirewallStatus>(`${this.apiUrl}/firewall/status`);
  }

  getFirewallRules(): Observable<FirewallRule[]> {
    return this.http.get<FirewallRule[]>(`${this.apiUrl}/firewall/rules`);
  }

  addFirewallRule(rule: NewFirewallRule): Observable<any> {
    return this.http.post(`${this.apiUrl}/firewall/rules`, rule);
  }

  deleteFirewallRule(ruleNumber: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/firewall/rules/${ruleNumber}`);
  }

  enableFirewall(): Observable<any> {
    return this.http.post(`${this.apiUrl}/firewall/enable`, {});
  }

  disableFirewall(): Observable<any> {
    return this.http.post(`${this.apiUrl}/firewall/disable`, {});
  }

  resetFirewall(): Observable<any> {
    return this.http.post(`${this.apiUrl}/firewall/reset`, {});
  }

  // FAIL2BAN METHODS
  getFail2BanStatus(): Observable<Fail2BanStatus> {
    return this.http.get<Fail2BanStatus>(`${this.apiUrl}/fail2ban/status`);
  }

  getBannedIPs(): Observable<BannedIP[]> {
    return this.http.get<BannedIP[]>(`${this.apiUrl}/fail2ban/banned-ips`);
  }

  unbanIP(ip: string, jail?: string): Observable<any> {
    const payload: any = { ip };
    if (jail) {
      payload.jail = jail;
    }
    return this.http.post(`${this.apiUrl}/fail2ban/unban`, payload);
  }

  fail2banServiceAction(action: 'start' | 'stop' | 'restart' | 'reload'): Observable<any> {
    return this.http.post(`${this.apiUrl}/fail2ban/service/${action}`, {});
  }
}
