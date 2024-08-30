import { Component, Input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { UserProfile } from 'src/app/models/app.models';
import { ChatMessage } from 'src/app/models/chat-models';

@Component({
  selector: 'chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.css']
})
export class ChatMessageComponent implements OnInit{
  @Input() message?: ChatMessage
  //@Input() usr?: string
  currentUser?:UserProfile
  isMe = true

  constructor(private store: Store<{profile: UserProfile}>){
    
  }

  ngOnInit(): void {
    this.store.select(k =>{
      if(k.profile != undefined){
        this.currentUser = k.profile;
        this.isMe = this.message?.senderId == this.currentUser?.username;
        }
    }).subscribe();
  }
}
