import { Component, Input } from '@angular/core';
import { RecentChat } from 'src/app/models/chat-models';

@Component({
  selector: 'chat-head',
  templateUrl: './chat-head.component.html',
  styleUrls: ['./chat-head.component.css']
})
export class ChatHeadComponent {
  @Input('head') chatHead?: RecentChat
}
