import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TransaccionPago } from '../models';

export interface GenerarLinkResponse {
  url: string;
  publicRequestKey: string;
  operationId: string;
  sandbox: boolean;
}

export interface TodoPagoConfig {
  enabled: boolean;
  hasMerchant: boolean;
  hasApiKey: boolean;
}

@Injectable({ providedIn: 'root' })
export class TodoPagoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/todopago`;

  getConfig(): Observable<TodoPagoConfig> {
    return this.http.get<TodoPagoConfig>(`${this.apiUrl}/config`);
  }

  generarLink(facturaId: number): Observable<GenerarLinkResponse> {
    return this.http.post<GenerarLinkResponse>(`${this.apiUrl}/generar-link/${facturaId}`, {});
  }

  consultarStatus(operationId: string): Observable<TransaccionPago> {
    return this.http.get<TransaccionPago>(`${this.apiUrl}/status/${operationId}`);
  }

  listarTransacciones(facturaId: number): Observable<TransaccionPago[]> {
    return this.http.get<TransaccionPago[]>(`${this.apiUrl}/transacciones/${facturaId}`);
  }
}
