import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { UserProfile } from 'src/app/models/app.models';
import { ChatMessage, RecentChat } from 'src/app/models/chat-models';

@Component({
  selector: 'open-ware',
  templateUrl: './open-ware.component.html',
  styleUrls: ['./open-ware.component.css']
})
export class OpenWareComponent implements OnInit{
  
  message?: string
  
  @Input() selectedHead?: RecentChat
  @Output() sendMessage: EventEmitter<string> = new EventEmitter();
  @Output() placeCall: EventEmitter<boolean> = new EventEmitter();
  @ViewChild("msgInput", {static: true}) msgInput!: ElementRef

  constructor(){
    
  }

  ngOnInit(): void {
   this.msgInput.nativeElement.focus()
  }

  showEmoji(){

  }

  kmsg(e:KeyboardEvent){
    if(e.key == "Enter") {
      this.sendMsg()
    }
  }
  
  sendMsg(){
    this.sendMessage.emit(this.message)
    this.message = undefined
  }

  newCall(start: boolean){
    this.placeCall.emit(start)
  }
}
