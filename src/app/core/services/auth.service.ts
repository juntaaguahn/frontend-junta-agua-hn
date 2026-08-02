import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, UsuarioLogueado } from '../models';
import { OfflineService } from './offline.service';
import { PeriodoService } from './periodo.service';

/**
 * Sesión basada en cookies HttpOnly (ja_token / ja_refresh).
 * El token JWT nunca se guarda en localStorage (no está expuesto a XSS).
 * En localStorage solo queda el perfil de usuario (no sensible) y un flag
 * de sesión que permite el acceso offline con sesión previa.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private injector = inject(Injector);
  private apiUrl = `${environment.apiUrl}/auth`;

  private get offline(): OfflineService {
    return this.injector.get(OfflineService);
  }

  private get periodo(): PeriodoService {
    return this.injector.get(PeriodoService);
  }

  private readonly USER_KEY = 'ja_user';
  private readonly SESSION_KEY = 'ja_session';

  // Estado reactivo con signals
  private _hasSession = signal(localStorage.getItem(this.SESSION_KEY) === '1');
  private _user = signal<UsuarioLogueado | null>(
    JSON.parse(localStorage.getItem(this.USER_KEY) || 'null'),
  );

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._hasSession());
  readonly rol = computed(() => this._user()?.rol || null);

  login(username: string, password: string): Observable<AuthResponse> {
    const body = { username, password };
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, body, { withCredentials: true })
      .pipe(tap((res) => this.setSession(res.user)));
  }

  /** Renueva la sesión usando el refresh token (cookie). Se usa ante un 401. */
  refreshSession(): Observable<UsuarioLogueado> {
    return this.http
      .post<{ user: UsuarioLogueado }>(`${this.apiUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        map((res) => {
          this.setSession(res.user);
          return res.user;
        }),
      );
  }

  changePassword(actual: string, nueva: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/password`, { actual, nueva });
  }

  me(): Observable<UsuarioLogueado> {
    return this.http.get<UsuarioLogueado>(`${this.apiUrl}/me`).pipe(tap((u) => this._user.set(u)));
  }

  private setSession(user: UsuarioLogueado) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.SESSION_KEY, '1');
    this._user.set(user);
    this._hasSession.set(true);
    // Nueva sesión: limpiar réplica offline del usuario anterior
    void this.offline.clearAllData();
    // Cargar período asignado al usuario recién logueado
    this.periodo.cargarDesdeSesion();
  }

  /** Cierra la sesión en el backend (revoca el refresh token) y limpia el estado local. */
  logout() {
    void this.http
      .post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        error: () => undefined,
      })
      .add(() => this.limpiarLocal());
  }

  private limpiarLocal() {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    this._user.set(null);
    this._hasSession.set(false);
    void this.offline.clearAllData();
    this.periodo.limpiar();
    this.router.navigate(['/login']);
  }

  hasRole(...roles: string[]): boolean {
    const r = this.rol();
    return !!r && roles.includes(r);
  }
}
