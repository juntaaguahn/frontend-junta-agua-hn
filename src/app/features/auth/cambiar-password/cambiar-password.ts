import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';

import { AuthService } from '../../../core/services/auth.service';
import { sha256 } from '../../../core/utils/crypto.util';

@Component({
  selector: 'app-cambiar-password',
  imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, MessageModule],
  templateUrl: './cambiar-password.html',
  styleUrl: './cambiar-password.scss',
})
export class CambiarPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);

  guardando = signal(false);
  error = signal('');
  exito = signal('');

  actual = '';
  nueva = '';
  confirmar = '';

  get validaciones(): { label: string; ok: boolean }[] {
    const p = this.nueva;
    return [
      { label: 'Mínimo 8 caracteres', ok: p.length >= 8 },
      { label: 'Al menos 1 mayúscula', ok: /[A-Z]/.test(p) },
      { label: 'Al menos 1 número', ok: /[0-9]/.test(p) },
      {
        label: 'Al menos 1 carácter especial (. + ! @ # $ etc.)',
        ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
      },
      {
        label: 'Las contraseñas coinciden',
        ok: this.nueva === this.confirmar && this.nueva.length > 0,
      },
    ];
  }

  get valido(): boolean {
    return this.validaciones.every((v) => v.ok) && this.actual.length > 0;
  }

  async onSubmit(): Promise<void> {
    this.error.set('');
    this.exito.set('');

    if (!this.valido) return;

    if (this.actual === this.nueva) {
      this.error.set('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    this.guardando.set(true);
    try {
      const nuevaHash = await sha256(this.nueva);
      this.auth.changePassword(this.actual, nuevaHash).subscribe({
        next: () => {
          this.exito.set('Contraseña actualizada correctamente');
          this.actual = '';
          this.nueva = '';
          this.confirmar = '';
        },
        error: (err) => {
          this.error.set(err.error?.error || 'Error al cambiar la contraseña');
          this.guardando.set(false);
        },
        complete: () => this.guardando.set(false),
      });
    } catch {
      this.error.set('Error al procesar la solicitud');
      this.guardando.set(false);
    }
  }

  volver(): void {
    this.location.back();
  }
}
