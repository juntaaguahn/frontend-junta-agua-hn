import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tarifa } from '../models';

@Injectable({ providedIn: 'root' })
export class TarifasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tarifas`;

  list(unidad?: string): Observable<Tarifa[]> {
    let params = new HttpParams();
    if (unidad) params = params.set('unidad', unidad);
    return this.http.get<Tarifa[]>(this.apiUrl, { params });
  }

  get(id: number): Observable<Tarifa> {
    return this.http.get<Tarifa>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Tarifa>): Observable<Tarifa> {
    return this.http.post<Tarifa>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Tarifa>): Observable<Tarifa> {
    return this.http.put<Tarifa>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
