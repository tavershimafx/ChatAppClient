import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ICallRequest } from 'src/app/models/app.models';
@Component({
  selector: 'meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.css']
})
export class MeetingComponent implements OnInit, OnDestroy {
  @Input() callData?: ICallRequest
  @Input() callingText?: string
  @Input() received?: boolean = false

  // @ViewChild("audioEl", { static: true }) audioEl!: ElementRef
  // @ViewChild("playBtn", { static: true }) playBtn!: ElementRef
  // @ViewChild("vol", { static: true }) vol!: ElementRef
  // @ViewChild("pan", { static: true }) pan!: ElementRef
  // @ViewChild("fileDiag", { static: true }) fileDiag!: ElementRef
  // @ViewChild("fileInput", { static: false }) fileInput!: ElementRef

  @Input() endMeet?: boolean
  @Output() endMeetChange: EventEmitter<boolean> = new EventEmitter()
  @Output() receiveCall: EventEmitter<boolean> = new EventEmitter()

  constructor(){
   
  }

  ngOnInit(): void {
  
  }

  ngOnDestroy(): void {
    
  }
  
  receive(){
    this.receiveCall.emit(true)
  }
  
  async endCall(){
    this.endMeetChange.emit(true)
  }
}
