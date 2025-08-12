import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-simple-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; font-family: Arial;">
      <h1 style="color: green;">✅ Angular Funcionando!</h1>
      <p>Se você está vendo isso, o Angular carregou corretamente!</p>
      <p>Timestamp: {{getCurrentTime()}}</p>
      <button (click)="showAlert()" style="padding: 10px; font-size: 16px;">
        Clique para testar JavaScript
      </button>
    </div>
  `
})
export class SimpleTestComponent {
  getCurrentTime(): string {
    return new Date().toLocaleString();
  }

  showAlert(): void {
    alert('JavaScript e Angular funcionando perfeitamente!');
    console.log('Botão clicado - Angular está funcionando!');
  }
}
