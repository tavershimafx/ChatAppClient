import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import * as signalR from '@microsoft/signalr'
import { ChatMessage, RecentChat } from './models/chat-models';
import { Store } from '@ngrx/store';
import { ICallRequest, UserProfile } from './models/app.models';
import { userGlobal } from './store/actions/profile.action';
import { Observable, Subscription } from 'rxjs';


@Component({
  selector: 'app-root',
  template: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy{
  q?: string
  sError?: string
  searchUser?: string
  recentChats?: RecentChat[]
  selectedHead?: RecentChat
  currentUser?: UserProfile
  callData?: ICallRequest

  chatDialog = false
  callDialog = false
  callSubject?: signalR.Subject<any>
  connection:signalR.HubConnection;

  /**
   * The Id of the last received call as sent by the server
   */
  callId?: number

  /**
   * The Id of a call last rejected or ended
   */
  rejectedCallId?: number

  /**
   * 
   */
  callingText?:string
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

  constructor(private store:Store){

    // we need to check for autoplay but the feature is experimental
    // so lets just check anyway by manipulating it with type any
    //this.navigatorRef = navigator
    this.connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7225/chatHub")
    .withAutomaticReconnect([0, 1000, 3000, 5000, 7000, 10000, 12000, 15000, 20000, 30000 ])
    .build();
  }

  ngOnInit(): void {
    // Start the connection.
      this.start();
      this.connection.on("LoadMessages", (u, k) => this.loadMessages(u, k));
      this.connection.on("ChatMessage",  (m) => this.receiveMessage(m));
      this.connection.on("IsOnline", (m) => this.isOnline(m));
      this.connection.on("IsUser",  (d) => this.isUser(d));
      this.connection.on("IsRead",  (d) => this.isRead(d));
      this.connection.on("DeliveryReport",  (d) => this.deliveryReport(d));
      this.connection.on("PlaceCall", (data) => this.placeCall(data));
      this.connection.on("EndCall", (data) => this.endCall(data));
      
      this.connection.onclose((e) => this.connectionClosing());
      this.connection.onreconnected((e) => this.getMessages());
      
      
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
        console.log("calling halt")
        this.haltActivities()
      }
    })
    
  }

ngOnDestroy(): void {
  if (this.audioCtx){
    if (this.source){
      this.source.stop();
      this.source!.disconnect(this.audioCtx!.destination)
      this.source = undefined
    }

    this.audioCtx = undefined
  }
}


async haltActivities(){
  console.log("attempting to halt activities")
  
  if (this.isRinging) {
    this.callRinging(true)
  }

  if (this.callConnected){

  }
  this.cancelCall = true
  this.callDialog = false
}

async endCall(data: any){
  console.log("end call called", data)
  await this.haltActivities()
  
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

  /**
   * plays a sound informing the user of an incoming call. If the method is called
   * with the @param stop to be true, it assumes the call tune was already
   * playing and you probably wants to stop it
   * @param stop determines whether or not to stop the calling sound
   */
  async callRinging(stop = false){
    console.log("stop this.isRinging", stop, this.isRinging)
    if (!stop && !this.isRinging){
      this.isRinging = true
      this.source = this.audioCtx!.createBufferSource();
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
      // I realized that, if the caller places a call and on the first beep
      // ends the call, the audio source might not have connected to the
      // the destination maybe due to the time taken to buffer the sound
      // so regardless, lets always wait for a few micro seconds before 
      // attempting to disconnect or stop the sound
      setTimeout(() => {
        if (stop && this.isRinging){
          this.isRinging = false
          this.source!.stop();
          this.source!.disconnect(this.audioCtx!.destination)
        }
      }, 1000);
    }
  }

  /**
   * 
   * @param id Id of the caller
   */
  placeCall(data: any){
    this.callData = { 
      receiverId: data.caller,
      isCaller: false,
      connectionId: data.connectionId,
      end: data.end,
    }

    console.log("data", data)
    console.log("this.isRinging", this.isRinging)
    console.log("this.callDialog", this.callDialog)
    this.callId = data.id
    // the user is in another call or was calling and the other
    // disconnected from the network
    if (this.callDialog == true && data.end == true && this.isRinging == false){
      this.cancelCall = true
      
    }else{
      if (this.callId != this.rejectedCallId)
        this.callRinging(data.end)
    }

    this.callDialog = !data.end
  }

  /**
   * Places a call to the user who was passed in when the dialog launches
   * the user is usually the user opened and displayed in the chat interface.
   * The call is being placed for 120 secs and thereafter quits calling, then
   * sends a quit signal to the server to quit the call
   */
  async startCall(){
    if (this.callData?.isCaller){
      this.source = this.audioCtx!.createBufferSource();

      try {
        const response = await fetch("/assets/phone-calling.mp3");
        let bfr = await response.arrayBuffer();
        
        this.source.buffer = await this.audioCtx!.decodeAudioData(bfr);
      } catch (err:any) {
        console.error(`Unable get call media: ${name} Error: ${err.message}`,);
      }

      this.source.loop = true
      this.source.connect(this.audioCtx!.destination)
      this.source.start()

      var iteration = 0;
      const intervalHandle = setInterval(() => {
          iteration++;
          
          if (this.cancelCall){
            this.callData!.end = true
            this.streamAudio(this.callData);
            this.source!.stop()
            this.source!.disconnect(this.audioCtx!.destination)
            clearInterval(intervalHandle);
            return
          }

          // stop calling if connected
          if (this.callConnected){
            clearInterval(intervalHandle);
            this.source!.stop()
            this.source!.disconnect(this.audioCtx!.destination)

            this.callData!.end = true
            this.streamAudio(this.callData);
            this.newCall(false)
            return
          }

          if (iteration === 120) {
            this.source!.stop()
            this.source!.disconnect(this.audioCtx!.destination)
            clearInterval(intervalHandle);
            
            this.callData!.end = true
            this.streamAudio(this.callData);
            this.newCall(false)
            return
          }

          this.streamAudio(this.callData);
      }, 500);
    }else{
      this.callConnected = true
      this.startSetupCall()
    }
  }
  
  startSetupCall(){
    console.log("setting up call..")
    this.createSource()
    this.callRinging(true);
  }

  /**
   * Determines if the call dialog should show.
   * @param visible a flag to set if the dialog should pop up for a call. If
   * true, the dialog shows up, if false, probably a call is already in
   * session and the user wants to end it. This can be initiated from the 
   * call dialog to end a call too
   */
  async newCall(visible:boolean) {
    if (visible){
      this.callData = { 
        receiverId: this.selectedHead?.username!,
        isCaller: true,
        connectionId: undefined,
        end: false
      }
      this.cancelCall = false
      this.startCall()
    }else{
      if (this.callDialog == true){
        this.cancelCall = true
        if (this.isRinging){
          // reject call
          this.rejectedCallId = this.callId
          await this.haltActivities()
          this.connection.invoke("EndCall", this.callId, true).catch(function (err) {
            return console.error(err.toString());
          });
        }

        if (this.callConnected){
          // end call
          this.rejectedCallId = this.callId
          await this.haltActivities()
          this.connection.invoke("EndCall", this.callId, false).catch(function (err) {
            return console.error(err.toString());
          });
        }
      }
    }

    this.callDialog = visible
  }

  async streamAudio(data:any){
    if (this.callSubject == null)
      this.callSubject = new signalR.Subject();
    
    await this.connection.send("PlaceCall", this.callSubject);

    this.callSubject.next(data);
    this.callSubject.complete();
  }

  // navigatorRef: any
  // async requestMediaPermission(){
  //   //navigator.requestMIDIAccess({software: true})
  //   console.log("mediaelement policy", this.navigatorRef.getAutoplayPolicy("mediaelement"))
  //   console.log("audiocontext policy", this.navigatorRef.getAutoplayPolicy("audiocontext"))
  // }

  newChat(visible:boolean) {
    if(!visible){
      this.searchUser = undefined
    }
    
    this.chatDialog = visible
  }

  kUsr(e:KeyboardEvent){
    if(e.key == "Enter") this.isUser(this.searchUser)
  }

  loadUser(head:RecentChat){
    
    // console.log("mediaelement policy", this.navigatorRef.getAutoplayPolicy("mediaelement"))
    // console.log("audiocontext policy", this.navigatorRef.getAutoplayPolicy("audiocontext"))

    this.selectedHead = head
    let unread = this.selectedHead.chats?.filter(r => r.senderId == this.currentUser?.username && r.isRead == false).map(i => i.id!);
    let read = this.selectedHead.chats?.filter(r => r.recepientId != this.selectedHead?.username && r.isRead == false).map(i => i.id!);
    this.sendReadReceipt(read!)
    this.isRead(unread)
    this.selectedHead.unreadCount = 0;
    //this.selectedUser.chats?.forEach((r, i) => r.isRead = true)
    //this.recentChats?.find(p => p.username == head.username)?.chats?.forEach((r, i) => r.isRead = true)
  }

  loadMessages(username:string, recentChats:RecentChat[]) {
    this.recentChats = recentChats;
    let p = new UserProfile();
    p.displayName = username;
    p.username = username;
    this.currentUser = p;

    (this.store as Store<{profile: UserProfile}>).dispatch(userGlobal({profile: p}));
  }


  isUser(data: string | any){
    this.sError = undefined
    if(typeof(data) == "string"){
      this.connection.invoke("IsUser", data).catch(function (err) {
        return console.error(err.toString());
      });
    }else{
      if(data.valid){
        if (this.recentChats?.find(u => u.username == data.username) == undefined){
          this.selectedHead = new RecentChat()
          this.selectedHead.username = data.username
          this.selectedHead.displayName = data.username
          this.newChat(false)
          this.loadUser(this.selectedHead)
          return
        }
        
        this.newChat(false)
        this.loadUser(this.recentChats?.find(u => u.username == data.username)!)
      }else{
        this.sError = data.msg
      }
    }
  }

  /**
   * Check if a user is online
   * @param userId 
   */
  isOnline(user: string | object) {
    if (typeof(user) == "string"){
      this.connection.invoke("IsOnline", user).catch(function (err) {
        return console.error(err.toString());
      });
    }else{

    }
  }

  /**
   * Pending unification
   * @param msgIds 
   */
  sendReadReceipt(msgIds: number[]){
    if(msgIds.length > 0){
      this.connection.invoke("SendReadReceipt", msgIds).catch(function (err) {
        return console.error(err.toString());
      });
    }
  }

  /**
   * Sends a message to the desired receipient
   * @param message 
   */
  sendMessage(message:string){
    if (message?.trim() != ""){
      let msg = new ChatMessage()
      msg.message = message
      msg.senderId = this.currentUser?.username
      msg.sentTime = new Date().toISOString()

      this.connection!.invoke("SendMessage", this.selectedHead?.username, msg).catch(function (err) {
        return console.error(err.toString());
      });

      msg.isSent = true
      let rc = this.recentChats?.find(k => k.username == this.selectedHead?.username)
      rc!.chats?.push(msg)
      rc!.lastMessage = msg.message
    }
  }

  /**
   * Pending unification
   * @param msgIds 
   */
  isRead(msgIds?: number[] | object){
    if(msgIds instanceof Array && typeof(msgIds![0]) == "number"){
        this.connection.invoke("IsRead", msgIds).catch(function (err) {
        return console.error(err.toString());
      });
    }else{
      let read = msgIds as any[]
      read.forEach((m, i) =>{
        let l = this.recentChats?.find(p => p.username == m.recepientId)?.chats?.find(c => c.id == m.id)
        l!.isRead = true
      })
    }
  }

  /**
   * pending unification
   * @param message 
   */
  deliveryReport(message:ChatMessage) {
    console.log("message has been delivered", message)
    let ch = this.recentChats?.find(k => k.senderId == message.senderId)?.chats?.find(r => r.ref == message.ref);
    ch!.id = message.id
    ch!.isDelivered = true
  }

  // readReceipt(message:ChatMessage) {
  //   console.log("chatRead", message)
  //   let ch = this.recentChats?.find(k => k.senderId == message.senderId)?.chats?.find(r => r.id == message.id);
  //   ch!.isRead = message.isRead
  //   ch!.readTime = message.readTime
  // }

  /**
   * receiver action to accept a message pushed by the server
   * @param message 
   */
  receiveMessage(message:ChatMessage) {
    let us = this.recentChats?.find(u => u.username == message.senderId)
    if (us != null){
      this.recentChats?.find(u => u.username == message.senderId)!.chats?.push(message)
      us.lastMessage = message.message

      if (this.selectedHead?.username != us.username){
        us.unreadCount!++
      }
    }else{
      let rc = new RecentChat()
      rc.displayName = message.senderId
      rc.isOnline = true
      rc.lastActiveTime = message.sentTime
      rc.lastMessage = message.message
      rc.username = message.senderId
      rc.chats = new Array<ChatMessage>()
      rc.unreadCount = 1
      rc.chats.push(message)

      if(!this.recentChats) this.recentChats = new Array<RecentChat>()
      this.recentChats.push(rc)
    }
  }

  /**
   * Loads messages from the server when the user first opens
   * the chat interface
   */
  getMessages(){
    this.connection.invoke("LoadMessages").catch(function (err) {
      return console.error(err.toString());
    });
  }

  connectionClosing(){

  }

  /**
   * Starts a socket connection to the server
   */
  async start() {
      try {
          await this.connection.start();
          console.log("SignalR Connected.");

          // we wait for some few seconds so the socket is initialized properly
          setTimeout(() => this.getMessages(), 1000);
      } catch (err) {
          setTimeout(this.start, 5000);
      }
  };
}

// We need an async function in order to use await, but we want this code to run immediately,
// so we use an "immediately-executed async function"
// (async () => {
//   try {
//       await connection.start();
//   } catch (e) {
//       console.error(e.toString());
//   }
// })();