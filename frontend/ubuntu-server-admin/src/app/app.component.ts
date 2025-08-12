import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './shared/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'ubuntu-server-admin';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    // O ThemeService já inicializa automaticamente no constructor
    // Este ngOnInit garante que o serviço seja injetado na inicialização da app
  }
}
