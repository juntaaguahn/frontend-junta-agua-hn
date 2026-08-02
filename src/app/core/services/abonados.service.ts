import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Abonado, Paginated } from '../models';

@Injectable({ providedIn: 'root' })
export class AbonadosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/abonados`;

  list(params?: {
    q?: string;
    sector?: string;
    estado?: string;
    page?: number;
    limit?: number;
  }): Observable<Paginated<Abonado>> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v != null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<Paginated<Abonado>>(this.apiUrl, { params: httpParams });
  }

  get(id: number): Observable<Abonado> {
    return this.http.get<Abonado>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Abonado>): Observable<Abonado> {
    return this.http.post<Abonado>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Abonado>): Observable<Abonado> {
    return this.http.put<Abonado>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  sectores(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/meta/sectores`);
  }
}
