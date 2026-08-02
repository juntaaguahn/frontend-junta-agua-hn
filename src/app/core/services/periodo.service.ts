import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { UsuariosPeriodoService } from './usuarios-periodo.service';
import { UsuarioPeriodo } from '../models';

/**
 * Período asignado al usuario logueado (tperiodo via usuarios_periodo).
 * Variable global para toda la app: se carga al iniciar sesión y se consume
 * en cualquier feature (ej. lecturas) para prellenar el período de trabajo.
 */
@Injectable({ providedIn: 'root' })
export class PeriodoService {
  private auth = inject(AuthService);
  private upService = inject(UsuariosPeriodoService);

  private _periodo = signal<UsuarioPeriodo | null>(null);
  readonly periodo = this._periodo.asReadonly();
  readonly tienePeriodo = computed(() => !!this._periodo());
  readonly cargando = signal(false);

  private cargadoPara: number | null = null;

  /** Período en formato YYYY-MM (el que usa el dominio de lecturas/facturas). */
  readonly periodoLectura = computed<string>(() => {
    const p = this._periodo();
    if (!p) return '';
    return `${p.anio}-${String(p.periodo_num).padStart(2, '0')}`;
  });

  /** Consulta el período asignado al usuario de la sesión actual. */
  cargarDesdeSesion(): void {
    const user = this.auth.user();
    if (!user) {
      this._periodo.set(null);
      this.cargadoPara = null;
      return;
    }
    if (this.cargadoPara === user.id) return;
    this.cargadoPara = user.id;

    this.cargando.set(true);
    this.upService.list(user.id).subscribe({
      next: (res) => {
        this._periodo.set(res[0] ?? null);
        this.cargando.set(false);
      },
      error: () => {
        this._periodo.set(null);
        this.cargando.set(false);
      },
    });
  }

  limpiar(): void {
    this._periodo.set(null);
    this.cargadoPara = null;
    this.cargando.set(false);
  }
}
