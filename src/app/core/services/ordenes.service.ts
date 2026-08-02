import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdenCorte, Paginated } from '../models';

@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ordenes`;

  list(params?: {
    estado?: string;
    q?: string;
    des?: string;
    hasta?: string;
    page?: number;
    limit?: number;
  }): Observable<Paginated<OrdenCorte>> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v != null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<Paginated<OrdenCorte>>(this.apiUrl, { params: httpParams });
  }

  get(id: number): Observable<OrdenCorte> {
    return this.http.get<OrdenCorte>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<OrdenCorte>): Observable<OrdenCorte> {
    return this.http.post<OrdenCorte>(this.apiUrl, data);
  }

  ejecutar(id: number): Observable<OrdenCorte> {
    return this.http.put<OrdenCorte>(`${this.apiUrl}/${id}/ejecutar`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
