import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sector } from '../models';

@Injectable({ providedIn: 'root' })
export class SectoresService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/sectores`;

  list(): Observable<Sector[]> {
    return this.http.get<Sector[]>(this.apiUrl);
  }

  get(id: number): Observable<Sector> {
    return this.http.get<Sector>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Sector>): Observable<Sector> {
    return this.http.post<Sector>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Sector>): Observable<Sector> {
    return this.http.put<Sector>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
