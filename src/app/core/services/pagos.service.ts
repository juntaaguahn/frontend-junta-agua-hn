import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pago, Paginated } from '../models';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/pagos`;

  list(params?: {
    q?: string;
    abonado_id?: number;
    factura_id?: number;
    des?: string;
    hasta?: string;
    page?: number;
    limit?: number;
  }): Observable<Paginated<Pago>> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v != null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<Paginated<Pago>>(this.apiUrl, { params: httpParams });
  }

  get(id: number): Observable<Pago> {
    return this.http.get<Pago>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Pago>): Observable<Pago> {
    return this.http.post<Pago>(this.apiUrl, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
