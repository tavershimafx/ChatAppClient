import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ChatMessage } from 'src/app/models/chat-models';

@Component({
  selector: 'chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.css']
})
export class ChatMessageComponent implements OnInit{
  @Input("message") message?: ChatMessage
  @ViewChild("body", { static: true }) container!: ElementRef

  ngOnInit(): void {
    if (this.message){
      this.container.nativeElement.classList.add("from-me")
    }
  }
}
