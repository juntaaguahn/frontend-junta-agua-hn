import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReporteRecaudo, ReporteMorosidad, ReporteResumen } from '../models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reportes`;

  recaudo(des?: string, hasta?: string): Observable<ReporteRecaudo> {
    let params = new HttpParams();
    if (des) params = params.set('des', des);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ReporteRecaudo>(`${this.apiUrl}/recaudo`, { params });
  }

  morosidad(sector?: string): Observable<ReporteMorosidad> {
    let params = new HttpParams();
    if (sector) params = params.set('sector', sector);
    return this.http.get<ReporteMorosidad>(`${this.apiUrl}/morosidad`, { params });
  }

  resumen(): Observable<ReporteResumen> {
    return this.http.get<ReporteResumen>(`${this.apiUrl}/resumen`);
  }

  abonado(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/abonado/${id}`);
  }
}
