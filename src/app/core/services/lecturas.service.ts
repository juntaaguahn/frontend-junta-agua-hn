import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateLectura, Lectura, Paginated, UpdateLectura } from '../models';

@Injectable({ providedIn: 'root' })
export class LecturasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/lecturas`;

  list(params?: {
    q?: string;
    abonado_id?: number;
    periodo?: string;
    facturada?: boolean;
    fecha_desde?: string;
    fecha_hasta?: string;
    page?: number;
    limit?: number;
  }): Observable<Paginated<Lectura>> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v != null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<Paginated<Lectura>>(this.apiUrl, { params: httpParams });
  }

  get(id: number): Observable<Lectura> {
    return this.http.get<Lectura>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateLectura): Observable<Lectura> {
    return this.http.post<Lectura>(this.apiUrl, data);
  }

  update(id: number, data: UpdateLectura): Observable<Lectura> {
    return this.http.put<Lectura>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
