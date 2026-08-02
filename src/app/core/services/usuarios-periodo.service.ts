import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsuarioPeriodo } from '../models';

@Injectable({ providedIn: 'root' })
export class UsuariosPeriodoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/usuarios-periodo`;

  list(usuarioId?: number): Observable<UsuarioPeriodo[]> {
    return this.http.get<UsuarioPeriodo[]>(this.apiUrl, {
      params: usuarioId ? { usuarioId: String(usuarioId) } : undefined,
    });
  }

  create(data: Partial<UsuarioPeriodo>): Observable<UsuarioPeriodo> {
    return this.http.post<UsuarioPeriodo>(this.apiUrl, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
