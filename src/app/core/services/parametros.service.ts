import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Parametro } from '../models';

@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/parametros`;

  list(): Observable<Parametro[]> {
    return this.http.get<Parametro[]>(this.apiUrl);
  }

  get(id: number): Observable<Parametro> {
    return this.http.get<Parametro>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Parametro>): Observable<Parametro> {
    return this.http.post<Parametro>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Parametro>): Observable<Parametro> {
    return this.http.put<Parametro>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
