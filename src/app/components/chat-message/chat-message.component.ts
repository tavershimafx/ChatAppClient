import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ChatMessage } from 'src/app/models/chat-models';

@Component({
  selector: 'chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.css']
})
export class ChatMessageComponent implements OnInit{
  @Input() message?: ChatMessage
  @Input() usr?: string
  @ViewChild("body", { static: true }) container!: ElementRef

  ngOnInit(): void {
    console.log("message to load", this.message)
    console.log("user", this.usr)
    if (this.message?.senderId == this.usr || this.message?.recepientId == this.usr){
      this.container.nativeElement.classList.add("from-me")
    }
  }
}
