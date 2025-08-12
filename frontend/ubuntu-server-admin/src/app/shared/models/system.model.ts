// System Information Models
export interface SystemInfo {
  hostname: string;
  os_version: string;
  kernel_version: string;
  uptime: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  load_average: number[];
  cpu_count: number;
  memory_total: number;
  memory_available: number;
  disk_total: number;
  disk_free: number;
  timestamp: string;
}

// Service Information
export interface ServiceInfo {
  name: string;
  status: 'active' | 'inactive' | 'failed' | 'unknown';
  enabled: boolean;
  description?: string;
  main_pid?: number;
  memory_usage?: number;
  cpu_usage?: number;
}

export interface ServicesResponse {
  services: ServiceInfo[];
  total: number;
  active: number;
  failed: number;
}

// Network Interface Information
export interface NetworkInterface {
  name: string;
  ip_address: string;
  netmask: string;
  broadcast?: string;
  mac_address?: string;
  status: 'up' | 'down';
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
  errors_in: number;
  errors_out: number;
  dropped_in: number;
  dropped_out: number;
}

// Disk Information
export interface DiskInfo {
  device: string;
  mountpoint: string;
  filesystem: string;
  total: number;
  used: number;
  free: number;
  percent: number;
}

// Process Information
export interface ProcessInfo {
  pid: number;
  name: string;
  username: string;
  cpu_percent: number;
  memory_percent: number;
  memory_info: {
    rss: number;
    vms: number;
  };
  status: string;
  create_time: number;
  cmdline: string[];
}

// User Information
export interface UserInfo {
  username: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
  groups: string[];
  last_login?: string;
  password_last_changed?: string;
}

// Package Information
export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  installed: boolean;
  upgradable: boolean;
  size?: number;
  section?: string;
  priority?: string;
}

// Docker Information
export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string[];
  created: string;
  size?: number;
  networks?: string[];
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: number;
  created: string;
}

// Firewall Rule
export interface FirewallRule {
  num: number;
  to: string;
  action: string;
  from: string;
  port?: string;
  protocol?: string;
  comment?: string;
}

// Log Entry
export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  service: string;
  message: string;
  pid?: number;
  facility?: string;
}

// Security Audit
export interface SecurityAudit {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: any;
  timestamp: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  system: SystemInfo;
  services: {
    total: number;
    running: number;
    failed: number;
    critical_services: ServiceInfo[];
  };
  resources: {
    cpu_history: number[];
    memory_history: number[];
    disk_alerts: DiskInfo[];
    network_traffic: {
      interface: string;
      bytes_per_second: number;
    }[];
  };
  security: {
    firewall_enabled: boolean;
    failed_logins: number;
    open_ports: number[];
    last_security_scan?: string;
  };
  alerts: {
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    service?: string;
  }[];
}

// Configuration Models
export interface NginxConfig {
  sites_available: string[];
  sites_enabled: string[];
  config_test_status: boolean;
  version: string;
  modules: string[];
}

export interface PhpConfig {
  version: string;
  extensions: string[];
  ini_settings: { [key: string]: string };
  fpm_pools: string[];
  memory_limit: string;
  max_execution_time: number;
}

export interface NodeConfig {
  version: string;
  npm_version: string;
  global_packages: PackageInfo[];
  projects: {
    path: string;
    name: string;
    version: string;
    dependencies: number;
  }[];
}

export interface DotnetConfig {
  version: string;
  runtime_versions: string[];
  sdks: string[];
  global_tools: PackageInfo[];
  projects: {
    path: string;
    name: string;
    framework: string;
    target_framework: string;
  }[];
}
