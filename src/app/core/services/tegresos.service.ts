import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tegreso } from '../models';

@Injectable({ providedIn: 'root' })
export class TegresosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tegresos`;

  list(): Observable<Tegreso[]> {
    return this.http.get<Tegreso[]>(this.apiUrl);
  }

  get(id: number): Observable<Tegreso> {
    return this.http.get<Tegreso>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Tegreso>): Observable<Tegreso> {
    return this.http.post<Tegreso>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Tegreso>): Observable<Tegreso> {
    return this.http.put<Tegreso>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
