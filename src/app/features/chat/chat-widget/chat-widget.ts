import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ChatPanel } from '../chat-panel/chat-panel';
import type { ChatTipo } from '../../../core/services/chat.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, ButtonModule, ChatPanel],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.scss',
})
export class ChatWidget {
  tipo = input<ChatTipo>('interno');
  abierto = signal(false);

  readonly subtitulo = computed(() =>
    this.tipo() === 'abonado' ? 'Ayuda para abonados' : 'Ayuda para el personal',
  );

  toggle() {
    this.abierto.update((v) => !v);
  }
}
