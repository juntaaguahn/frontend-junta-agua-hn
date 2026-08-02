import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ChatService, ChatTipo } from '../../../core/services/chat.service';
import type { ChatMensaje } from '../../../core/models';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss',
})
export class ChatPanel {
  private chatService = inject(ChatService);
  private scrollArea = viewChild<ElementRef>('scrollArea');

  tipo = input<ChatTipo>('interno');
  sugerencias = input<string[]>([]);

  mensajes = signal<ChatMensaje[]>([]);
  texto = signal('');
  enviando = signal(false);

  readonly esAbonado = computed(() => this.tipo() === 'abonado');

  readonly sugerenciasMostrar = computed<string[]>(() => {
    const s = this.sugerencias();
    if (s.length) return s;
    if (this.esAbonado()) {
      return [
        '¿Cómo pago mi factura?',
        '¿Cuáles son las tarifas?',
        '¿Qué pasa si me cortan el agua?',
        '¿Cuáles son los horarios de atención?',
      ];
    }
    return [
      '¿Cómo registro un pago?',
      '¿Cómo genero un reporte?',
      '¿Cómo registro una lectura?',
      '¿Cómo consulto el período activo?',
    ];
  });

  usarSugerencia(sug: string) {
    this.texto.set(sug);
    this.enviar();
  }

  enviar() {
    const contenido = this.texto().trim();
    if (!contenido || this.enviando()) return;

    const historial: ChatMensaje[] = [...this.mensajes(), { rol: 'usuario', contenido }];
    this.mensajes.set(historial);
    this.texto.set('');
    this.enviando.set(true);
    this.scrollAlFondo();

    this.chatService.enviarMensaje(historial, this.tipo()).subscribe({
      next: (res) => {
        this.mensajes.set([...this.mensajes(), { rol: 'asistente', contenido: res.respuesta }]);
        this.enviando.set(false);
        this.scrollAlFondo();
      },
      error: (err) => {
        const detalle =
          err?.error?.error ||
          'No se pudo contactar al asistente. Verifica tu conexión e intenta de nuevo.';
        this.mensajes.set([
          ...this.mensajes(),
          { rol: 'asistente', contenido: detalle, error: true },
        ]);
        this.enviando.set(false);
        this.scrollAlFondo();
      },
    });
  }

  private scrollAlFondo() {
    setTimeout(() => {
      const el = this.scrollArea()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
