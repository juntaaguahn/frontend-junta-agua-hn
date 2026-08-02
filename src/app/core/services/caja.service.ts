import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MovimientoCaja, Paginated } from '../models';

export interface CajaListResponse extends Paginated<MovimientoCaja> {
  resumen: {
    ingresos: number;
    egresos: number;
    saldo: number;
  };
}

@Injectable({ providedIn: 'root' })
export class CajaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/caja`;

  list(params?: {
    des?: string;
    hasta?: string;
    tipo?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Observable<CajaListResponse> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v != null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<CajaListResponse>(this.apiUrl, { params: httpParams });
  }

  create(data: Partial<MovimientoCaja>): Observable<MovimientoCaja> {
    return this.http.post<MovimientoCaja>(this.apiUrl, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
