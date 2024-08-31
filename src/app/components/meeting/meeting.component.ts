import * as signalR from '@microsoft/signalr'
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { ICallRequest, UserProfile } from 'src/app/models/app.models';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.css']
})
export class MeetingComponent implements OnInit, OnDestroy {
  @Input() callData?: ICallRequest
  @Input() isCaller?: boolean
  @Input() connection!: signalR.HubConnection

  @ViewChild("audioEl", { static: true }) audioEl!: ElementRef
  @ViewChild("playBtn", { static: true }) playBtn!: ElementRef
  @ViewChild("vol", { static: true }) vol!: ElementRef
  @ViewChild("pan", { static: true }) pan!: ElementRef
  @ViewChild("fileDiag", { static: true }) fileDiag!: ElementRef
  @ViewChild("fileInput", { static: false }) fileInput!: ElementRef
  @Input() endMeet?: boolean
  @Output() endMeetChange: EventEmitter<boolean> = new EventEmitter()
  @Output() sendStream: EventEmitter<any> = new EventEmitter()

  //currentUser?:UserProfile
  /**
   * Sets the call cancel state so observers can take action such as
   * stop calling or terminates the call immediately
   */
  cancelCall = false

  /**
   * A flag to indicate if a call was placed and the ringing tone is
   * being played
   */
  isRinging = false

  /**
   * Indicates if the call has been connected 
   */
  callConnected = false

  /**
   * The connection id of the caller or receiving end. This connectionId
   * could facilitate the server performing quick action without much
   * data overload if need be
   */
  callerConnection?: string

  /**
   * The system operates just a single audio context so we can track
   * media and minimize overhead. Most times, when an agent wants to
   * utilize the audio context, it disconnects the context from any
   * destination and passes a new destination to it.
   */
  audioCtx?:AudioContext = new AudioContext(); 

  /**
   * An audio source node which data can be loaded into it dynamically.
   */
  source?: AudioBufferSourceNode
  
  audioBuffer?: AudioBuffer

  /**
   * A temporary array in which when data is received from the server, persisted
   * for a while before transferring it to the @member audioBuffer
   */
  arrayBuffer?: Float32Array

  audioDialog = false
  fileName?: string

  clientEnded?: Subscription

  // streamConnection = new signalR.HubConnectionBuilder()
  // .withUrl("https://localhost:7225/streamHub")
  // .build();

  constructor(private store: Store<{profile: UserProfile}>){
    // this.store.select(k =>{
    //   if(k.profile != undefined){
    //     this.currentUser = k.profile;
    //     }
    // }).subscribe();
  }

  ngOnInit(): void {

   //this.startConnection();
  //  this.connection.on("PlaceCall", (data) => this.placeCall(data));
  //  this.connection.on("CallDataReceived", (data) => this.callDataReceived(data));
  //  this.connection.onclose(() => this.haltActivities());
   
  // if the calling user ended the call on his own side, the server
  // sends the object with end = true to inform the receiver to end the call
  // so we need to wait and see if that property changes at any given time
  this.clientEnded = new Observable(subscriber =>{
    if (this.callData?.end){
      subscriber.next()
      subscriber.complete()
      subscriber.unsubscribe()
    }
  }).subscribe({
    next: (e) =>{
      this.haltActivities()
    }
  })

   // the dialog takes 600ms to finish animating to we need to wait for it to
   // fully open before we start any activity. Actually lets give some more 
   // breating space to 800ms
    setTimeout(() => {
      if (this.callData?.isCaller == true){
        // place call immediately when the dialog launches
        this.placeCall()
       }else{
        // probably someone is caller if I'm not the caller
        this.isRinging = true
        this.callRinging()
       }
    }, 800);
   
  }

  ngOnDestroy(): void {
    if (this.audioCtx){
      this.audioCtx?.destination.disconnect()
      this.audioCtx = undefined
    }
  }

  // async startConnection() {
  //   try {
  //       await this.streamConnection.start();
  //   } catch (e:any) {
  //       console.error(e.toString());
  //   }
  // }

  haltActivities(){
    this.cancelCall = true
    this.callRinging(true)
  }

  endCall(){
    if (this.isRinging) {
      this.callRinging(false)
    }

    this.cancelCall = true
    this.endMeetChange.emit(true)
  }
  
  newAudio(close:boolean){
    this.audioDialog = close
  }
  
  async createSource(){
    this.audioCtx = new AudioContext()
    this.source = this.audioCtx.createBufferSource();
    try {
      this.audioBuffer = new AudioBuffer({ 
        length: this.arrayBuffer?.length!, 
        sampleRate: this.audioCtx.sampleRate, 
        numberOfChannels: 1 })
      this.audioBuffer.copyToChannel(this.arrayBuffer!, 1, 0)
      this.source.buffer = this.audioBuffer;

      this.source.connect(this.audioCtx.destination)
      //let l = this.source.buffer?.duration! * 1000;

      //let abf = new ArrayBuffer(444);
      //this.source.buffer = await this.audioCtx.decodeAudioData(abf);
    } catch (err:any) {
      console.error(`Unable to create audio source: ${name} Error: ${err.message}`,);
    }
  }

  callDataReceived(data:any){
    console.log("received audio data", data)
  }

  /**
   * plays a sound informing the user of an incoming call. If the method is called
   * with the @param stop to be true, it assumes the call tune was already
   * playing and you probably wants to stop it
   * @param stop determines whether or not to stop the calling sound
   */
  async callRinging(stop = false){
    this.source = this.audioCtx!.createBufferSource();
    if (!stop){
      try {
        const response = await fetch("/assets/ringing.mp3");
        let bfr = await response.arrayBuffer();
        
        this.source!.buffer = await this.audioCtx!.decodeAudioData(bfr);
      } catch (err:any) {
        console.error(`Unable get call media: ${name} Error: ${err.message}`,);
      }

      this.audioCtx!.resume()
      this.source.loop = true
      this.source.connect(this.audioCtx!.destination)
      this.source.start()
    }else{
      this.source.stop();
      this.source.disconnect(this.audioCtx!.destination)
    }
  }

  /**
   * Places a call to the user who was passed in when the dialog launches
   * the user is usually the user opened and displayed in the chat interface.
   * The call is being placed for 120 secs and thereafter quits calling, then
   * sends a quit signal to the server to quit the call
   */
  async placeCall(){
    if (this.callData?.isCaller){
      let ctx= new AudioContext()
      let src = ctx.createBufferSource();

      try {
        const response = await fetch("/assets/phone-calling.mp3");
        let bfr = await response.arrayBuffer();
        
        src.buffer = await ctx.decodeAudioData(bfr);
      } catch (err:any) {
        console.error(`Unable get call media: ${name} Error: ${err.message}`,);
      }
      src.loop = true
      src.connect(ctx.destination)
      src.start()

      var iteration = 0;
      const intervalHandle = setInterval(() => {
          iteration++;
          
          if (this.cancelCall){
            clearInterval(intervalHandle);
            src.stop()
            src.disconnect(ctx.destination)
            console.log("call cancelled")
            this.sendStream.emit({data: this.callData, end: true});
            return
          }

          // stop calling if connected
          if (this.callConnected){
            console.log("call connected")
            clearInterval(intervalHandle);
            src.stop()
            src.disconnect(ctx.destination)
            this.sendStream.emit({data: this.callData, end: true});
            return
          }

          console.log("emitting iteration ", iteration)
          this.sendStream.emit({data: this.callData, end: false});
          if (iteration === 120) {
              src.stop()
              src.disconnect(ctx.destination)
              console.log("iteration done")
              clearInterval(intervalHandle);
              this.sendStream.emit({data: this.callData, end: true});
          }
      }, 500);
    }else{
      this.callConnected = true
      this.startSetupCall()
    }
  }

  // async placeCall(data?:any){
  //   "Meeting component::A user is calling"
  // }

  // async placeCall(data?:any){
  //   if(this.callData?.isCaller){

  //     let ctx = new AudioContext()
  //     let src = ctx.createBufferSource();

  //     try {
  //       const response = await fetch("/assets/phone-calling.mp3");
  //       let bfr = await response.arrayBuffer();
        
  //       src.buffer = await ctx.decodeAudioData(bfr);
  //     } catch (err:any) {
  //       console.error(`Unable get call media: ${name} Error: ${err.message}`,);
  //     }
  //     src.loop = true
  //     src.connect(ctx.destination)
  //     src.start()

  //     const subject = new signalR.Subject();
  //     await this.streamConnection.send("PlaceCall", subject);
  //     // 120 iterations * 500ms = 20s
  //     var iteration = 0;
  //     const intervalHandle = setInterval(() => {
  //       iteration++;
  //       if (this.cancelCall){
  //         clearInterval(intervalHandle);
  //         src.stop()
  //         subject.complete();
  //       }

  //       console.log("calling another user", iteration, this.callData)
  //       subject.next(this.callData?.receiverId);

  //       // stop calling if connected
  //       if (this.callConnected){
  //         clearInterval(intervalHandle);
  //         src.stop()
  //         subject.complete();
  //       }

  //       if (iteration === 120) {
  //           src.stop()
  //           clearInterval(intervalHandle);
  //           subject.complete();
  //       }
  //     }, 500);

  //     subject.complete();
  //   }else{
  //     this.callConnected = true
  //     this.startSetupCall()
  //   }
  // }

  startSetupCall(){
    this.createSource()
    this.callRinging(true);
  }
}
