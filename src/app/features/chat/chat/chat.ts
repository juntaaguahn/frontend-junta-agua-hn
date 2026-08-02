import { Component } from '@angular/core';
import { ChatPanel } from '../chat-panel/chat-panel';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [ChatPanel],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {}
