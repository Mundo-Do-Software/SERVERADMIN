import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceService, ServiceInfo } from '../../core/services/service.service';

@Component({
  selector: 'app-services',
  imports: [CommonModule, FormsModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {
  services: ServiceInfo[] = [];
  filteredServices: ServiceInfo[] = [];
  isLoading = true;
  error: string | null = null;
  searchTerm = '';
  selectedFilter = 'all';
  
  // Modal states
  showDetailsModal = false;
  showConfirmModal = false;
  selectedService: ServiceInfo | null = null;
  pendingAction: string = '';
  actionInProgress = false;

  constructor(private serviceService: ServiceService) {}

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.isLoading = true;
    this.error = null;
    
    this.serviceService.getServices().subscribe({
      next: (services) => {
        this.services = services.map(service => ({
          ...service,
          status: this.getServiceStatus(service)
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading services:', error);
        this.error = error.message || 'Erro ao carregar serviços';
        this.isLoading = false;
      }
    });
  }

  getServiceStatus(service: ServiceInfo): 'online' | 'offline' | 'warning' {
    if (service.active_state === 'active') {
      return 'online';
    } else if (service.active_state === 'failed') {
      return 'warning';
    } else {
      return 'offline';
    }
  }

  applyFilters(): void {
    let filtered = [...this.services];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(term) ||
        service.description.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    switch (this.selectedFilter) {
      case 'running':
        filtered = filtered.filter(service => service.status === 'online');
        break;
      case 'stopped':
        filtered = filtered.filter(service => service.status === 'offline');
        break;
      case 'failed':
        filtered = filtered.filter(service => service.status === 'warning');
        break;
      case 'enabled':
        filtered = filtered.filter(service => service.enabled);
        break;
    }

    this.filteredServices = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  openDetailsModal(service: ServiceInfo): void {
    this.selectedService = service;
    this.showDetailsModal = true;
  }

  openConfirmModal(service: ServiceInfo, action: string): void {
    this.selectedService = service;
    this.pendingAction = action;
    this.showConfirmModal = true;
  }

  closeModals(): void {
    this.showDetailsModal = false;
    this.showConfirmModal = false;
    this.selectedService = null;
    this.pendingAction = '';
    this.actionInProgress = false;
  }

  confirmAction(): void {
    if (!this.selectedService || !this.pendingAction || this.actionInProgress) return;

    this.actionInProgress = true;
    const serviceName = this.selectedService.name;
    let actionObservable;

    switch (this.pendingAction) {
      case 'start':
        actionObservable = this.serviceService.startService(serviceName);
        break;
      case 'stop':
        actionObservable = this.serviceService.stopService(serviceName);
        break;
      case 'restart':
        actionObservable = this.serviceService.restartService(serviceName);
        break;
      case 'enable':
        actionObservable = this.serviceService.enableService(serviceName);
        break;
      case 'disable':
        actionObservable = this.serviceService.disableService(serviceName);
        break;
      default:
        this.actionInProgress = false;
        return;
    }

    actionObservable.subscribe({
      next: (response) => {
        console.log(`Service ${this.pendingAction} successful:`, response);
        this.loadServices(); // Reload services to get updated status
        this.closeModals();
        this.error = null;
        this.actionInProgress = false;
      },
      error: (error) => {
        console.error(`Error ${this.pendingAction} service:`, error);
        this.error = error.message || `Erro ao ${this.pendingAction} serviço`;
        this.actionInProgress = false;
        // Don't close modal on error so user can retry
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'online': return 'status-online';
      case 'offline': return 'status-offline';
      case 'warning': return 'status-warning';
      default: return 'status-unknown';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'online': return 'fas fa-play-circle';
      case 'offline': return 'fas fa-stop-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      default: return 'fas fa-question-circle';
    }
  }

  getActionButtonClass(action: string): string {
    switch (action) {
      case 'start': return 'btn-outline-success';
      case 'stop': return 'btn-outline-danger';
      case 'restart': return 'btn-outline-warning';
      case 'enable': return 'btn-outline-primary';
      case 'disable': return 'btn-outline-secondary';
      default: return 'btn-outline-primary';
    }
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'start': return 'fas fa-play';
      case 'stop': return 'fas fa-stop';
      case 'restart': return 'fas fa-redo';
      case 'enable': return 'fas fa-check';
      case 'disable': return 'fas fa-times';
      default: return 'fas fa-cog';
    }
  }

  refreshServices(): void {
    this.loadServices();
  }

  trackByServiceName(index: number, service: ServiceInfo): string {
    return service.name;
  }
}
