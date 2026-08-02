import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMensaje, ChatRespuesta } from '../models';

export type ChatTipo = 'interno' | 'abonado';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chat`;

  enviarMensaje(mensajes: ChatMensaje[], tipo: ChatTipo = 'interno'): Observable<ChatRespuesta> {
    return this.http.post<ChatRespuesta>(`${this.apiUrl}/${tipo}`, { mensajes });
  }
}
