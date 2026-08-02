import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';
import { AppParamsService } from '../../../core/services/app-params.service';
import { ChatWidget } from '../../chat/chat-widget/chat-widget';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    FloatLabelModule,
    Message,
    ChatWidget,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly params = inject(AppParamsService);

  username = '';
  password = '';
  cargando = signal(false);
  error = signal('');
  readonly isProd = environment.production;

  ngOnInit() {
    this.params.cargar();
  }

  onSubmit() {
    this.error.set('');
    if (!this.username || !this.password) {
      this.error.set('Ingresa usuario y contraseña');
      return;
    }
    this.cargando.set(true);
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error.set(
          err.status === 0
            ? 'No hay conexión con el servidor'
            : err.error?.error || 'Credenciales inválidas',
        );
        this.cargando.set(false);
      },
    });
  }
}
