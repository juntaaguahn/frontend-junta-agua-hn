import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Factura, Paginated } from '../models';

@Injectable({ providedIn: 'root' })
export class FacturasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/facturas`;

  list(params?: {
    abonado_id?: number;
    periodo?: string;
    estado?: string;
    page?: number;
    limit?: number;
  }): Observable<Paginated<Factura>> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v != null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<Paginated<Factura>>(this.apiUrl, { params: httpParams });
  }

  get(id: number): Observable<Factura> {
    return this.http.get<Factura>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Factura>): Observable<Factura> {
    return this.http.post<Factura>(this.apiUrl, data);
  }

  generarMasiva(periodo: string, fechaVencimiento: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/generar-masiva`, {
      periodo,
      fecha_vencimiento: fechaVencimiento,
    });
  }

  facturarLecturas(lecturaIds: number[], fechaVencimiento?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/facturar-lecturas`, {
      lectura_ids: lecturaIds,
      ...(fechaVencimiento ? { fecha_vencimiento: fechaVencimiento } : {}),
    });
  }

  update(id: number, data: Partial<Factura>): Observable<Factura> {
    return this.http.put<Factura>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  enviarCorreo(id: number, email?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/enviar-correo`, { email });
  }

  downloadPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
