import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Periodo } from '../models';

@Injectable({ providedIn: 'root' })
export class PeriodosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/periodos`;

  list(): Observable<Periodo[]> {
    return this.http.get<Periodo[]>(this.apiUrl);
  }

  get(id: number): Observable<Periodo> {
    return this.http.get<Periodo>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Periodo>): Observable<Periodo> {
    return this.http.post<Periodo>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Periodo>): Observable<Periodo> {
    return this.http.put<Periodo>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
