import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import * as signalR from '@microsoft/signalr'
import { ChatMessage, RecentChat } from '../../models/chat-models';
import { Store } from '@ngrx/store';
import { ICallRequest, UserProfile } from '../../models/app.models';
import { userGlobal } from '../../store/actions/profile.action';
import { HttpClient } from '@angular/common/http';
import { BASE_URL } from 'src/app/utilities/constants';


@Component({
  selector: 'chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy{
  q?: string
  sError?: string
  searchUser?: string
  recentChats?: RecentChat[]
  selectedHead?: RecentChat
  currentUser?: UserProfile
  callData?: ICallRequest

  chatDialog = false
  callDialog = false
  callSubject?: signalR.Subject<any> = new signalR.Subject()
  connection:signalR.HubConnection;

  /**
   * The Id of the last received call as sent by the server
   */
  callId?: number

  /**
   * 
   */
  callingText?:string

  /**
   * A flag to indicate if a call was placed and the ringing tone is
   * being played
   */
  isRinging = false

  /**
   * A flag to indicate if a call was placed and the calling tone is
   * being played
   */
  isCalling = false

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
  audioCtx?:AudioContext; 

  processorNode?: AudioWorkletNode

  gainNode?: GainNode

  microphone_stream?: MediaStreamAudioSourceNode

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

  constructor(private store:Store, private httpClient: HttpClient){

    // we need to check for autoplay but the feature is experimental
    // so lets just check anyway by manipulating it with type any
    //this.navigatorRef = navigator
    this.connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7225/chatHub", { 
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      
    })
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
      
      this.connection.on("ReceiveCall", (data) => this.receiveCall(data));
      this.connection.on("UpdateCallData", (data) => this.updateCallData(data));
      this.connection.on("clientEndCall", (data) => this.clientEndCall(data));
      this.connection.on("CallAccepted", (data) => this.callAccepted(data));
      this.connection.on("LoadSound", (data) => this.loadSound(data));
      
      this.connection.onclose((e) => this.connectionClosing());
      this.connection.onreconnected((e) => this.getMessages());

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

  async newCall(start:boolean){
    this.createAudioCtx()
    this.callDialog = true
    this.callData = { 
      receiverId: this.selectedHead?.username!,
      isCaller: true,
      connectionId: undefined,
      id: 0
    }

    try {
      const response = await fetch("/assets/phone-calling.mp3");
      let bfr = await response.arrayBuffer();
      this.source = this.audioCtx!.createBufferSource();
      this.source.buffer = await this.audioCtx!.decodeAudioData(bfr);

      this.source.loop = true
      this.source.connect(this.audioCtx!.destination)
      this.source.start()
    } catch (err:any) {
      console.error(`Unable to get call media: ${name} Error: ${err.message}`,);
    }

    this.isCalling = true
    await this.connection.send("PlaceCall", this.selectedHead?.username);

    setTimeout(() => {
      // end call after 60secs if no answer
      if (this.callData && this.isCalling){
        this.disconnectSource()
        this.callDialog = false
        this.connection.send("EndCall", this.callData.id, true);
      }
    }, 60000);
  }

  /**
   * A call was received from the server
   * @param data 
   */
  receiveCall(data: any){
    this.callData = { 
      receiverId: data.username,
      isCaller: false,
      connectionId: data.connectionId,
      id: data.id
    }
    
    this.callDialog = true
    this.callRinging()
  }

  /**
   * Caller gets call data to update
   * @param data
   */
  updateCallData(data: any){
    this.callData!.id = data.id
  }

  /**
   * Initiated by the caller or receiver to end the call
   */
  endCall(){
    if (this.callConnected){
      this.callConnected = false
      this.isCalling = false
      this.isRinging = false
      this.callDialog = false
      this.closeStreams()
      this.connection.send("EndCall", this.callData!.id, false);
      return
    }

    this.disconnectSource()
    this.callDialog = false
    if (this.isRinging){
      this.isRinging = false
      this.connection.send("EndCall", this.callData!.id, true);
    }else{
      this.isCalling = false
      this.connection.send("EndCall", this.callData!.id, false);
    }
  }

  /**
   * The caller wants to inform the receiver to end the call
   */
  clientEndCall(data: any){
    if(this.callConnected){
      this.callConnected = false
      this.isCalling = false
      this.isRinging = false
      this.callDialog = false
      //this.closeStreams()
      this.connection.send("EndCall", this.callData!.id, false);
    }
    
    if (this.isRinging){
      this.isRinging = false
      this.isCalling = false
      this.callConnected = false
      this.callDialog = false
      this.disconnectSource()
    }
    
    if(this.isCalling){
      this.isCalling = false
      this.isRinging = false
      this.callConnected = false
      this.callDialog = false
      this.disconnectSource()
    }
  }

  async acceptCall(){
    this.isRinging = false
    this.callConnected = true
    this.disconnectSource()

    console.log("accepting call from caller::::cId ", this.callData!.connectionId)
    this.connection.send("ConnectCall", this.callData!.id);

    // start streaming audio to caller
    //await this.record_audio()
    //await this.uploadBtn();
  }

  async callAccepted(data: any){
    this.callData!.connectionId = data.connectionId
    this.callData!.id = data.id;
    this.callConnected = true
    this.disconnectSource()

    // start streaming audio to receiver
    console.log("receipient accepted::::cId ", data.connectionId)
    await this.record_audio()
    //await this.uploadBtn();
  }

  buflength = 10
  chunkBuffer: Array<any> = []
  bPointer = 0

  loadSound(data:any){
    console.log("received chunk ", data)
    this.resetBuffer()

    // if (this.chunkBuffer[this.bPointer] != undefined){
    //   console.log("setting item ", this.bPointer)
    //   this.chunkBuffer[this.bPointer] = this.chunkBuffer[this.bPointer].concat(data)  
    // }else{
    //   console.log("current is null", this.bPointer)
    //   this.chunkBuffer[this.bPointer] = data
    // }

    // if (this.bPointer == 0){
    //   //this.bPointer++
    //   this.startBuffer(0)
    // }
  }

  private resetBuffer(){
    if (this.bPointer == this.buflength){
      this.bPointer = 0
    }
  }

  private startBuffer(point:number){
      let tmpBuffer = this.audioCtx?.createBuffer(1, this.chunkBuffer[point].length, this.audioCtx.sampleRate)
      tmpBuffer?.getChannelData(0)?.set(this.chunkBuffer[point], 0)
      
      this.source!.disconnect(this.audioCtx!.destination)
      this.source = this.audioCtx!.createBufferSource();
      this.source!.buffer = tmpBuffer!
      this.source!.connect(this.audioCtx!.destination)
      this.source.start()

      let l = this.source.buffer.duration * 1000
      setTimeout(() => {
        this.resetBuffer()
        console.log("incrementing..", this.bPointer)
        this.startBuffer(this.bPointer)
        this.bPointer++
      }, l);
  }

  async uploadBtn(){
    const response = await fetch("/assets/music/Sound_Of_Revival.mp3");
    let fer = await response.arrayBuffer();
    let adata = await this.audioCtx!.decodeAudioData(fer)

    //this.chunks = adata.getChannelData(1);
    let content = adata.getChannelData(1)
    await this.connection.send("StreamAudio", this.callSubject);
    
    console.log("content.length", content.length)
    const c_size = 30000 //30kb
    var current = 0;
    let pages = Math.ceil(content.length / c_size)
    console.log(`start stream [${new Date()}]`)
    const intervalHandle = setInterval(() => {
      let off = (current  * c_size) + c_size;
      let chunk = content.subarray(off, off + c_size)
      current++;
        
        this.callSubject!.next({ id: this.callData?.connectionId, data: chunk});
        if (current >= pages || (!this.isCalling && !this.isRinging && !this.callConnected)) {
         
          // TODO
          // REMOVE
          console.log(`iteration ${current}; pages ${pages}`)
          console.log(`end stream [${new Date()}]`)
          console.log("subject is ending")
          this.endCall()


          this.callSubject!.complete();
          clearInterval(intervalHandle);
        }
    }, 50);
  }

  async streamAudio(data:any){
    if (this.callSubject == null)
      this.callSubject = new signalR.Subject();
    
    //let a = data.slice(0, data.length/2)
    //let b = data.slice(data.length/2)

    await this.connection.send("StreamAudio", this.callSubject);
    this.callSubject.next({id: this.callData?.connectionId, data: data});
    //this.callSubject.next({id: this.callData?.connectionId, data: b});
    //this.callSubject.complete();
  }

  mediaRecorder?: MediaRecorder
  chunks?: Array<any>
  dest?: MediaStreamAudioDestinationNode
  constraints = { audio:true, video: false }

  // async record_audio() {
  //   if (navigator.mediaDevices){
  //     var $this = this;
  //     navigator.mediaDevices.getUserMedia(this.constraints).then((stream)=>{
  //       this.mediaRecorder = new MediaRecorder(stream)
  //       //this.mediaRecorder.ondataavailable = this.pushChunks;

  //       this.mediaRecorder.ondataavailable = function (e) {
  //         console.log("pushing chunk")
  //         $this.chunks.push(e.data);
  //       };
  //       console.log('starting recorder...')
  //       this.mediaRecorder.start();
  //     })
     
  //   } else { alert('getUserMedia not supported.'); }
  // }

  // stopRecording(){
  //   console.log("mime type", this.mediaRecorder!.mimeType)
  //   const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType });
  //     this.chunks = [];
  //     const audioURL = window.URL.createObjectURL(blob);
  //     window.open(audioURL);
  // }

  // pushChunks(e:BlobEvent){
  //   this.chunks.push(e.data);
  //   console.log(e.data.arrayBuffer())
  // }
 
  // async record_audio() {
  //   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  //   this.mediaRecorder = new MediaRecorder(stream);
    
  //   this.mediaRecorder.ondataavailable = async (event) => {
  //       if (event.data.size > 0) {
  //           // Send the audio chunk to the server as a binary blob.
  //           console.log("chunk..", event.data)
            
  //       }
  //   };
    
  //   this.mediaRecorder.start(300); // Collect audio data in 1-second intervals.
  // }


  /**
   * 
   * @param stream 
   */
  async record_audio() {
   
    console.log("audio is starting up ...");

    if (navigator.mediaDevices.getUserMedia){
      navigator.mediaDevices.getUserMedia({audio:true, video: false}).then(s => this.start_microphone(s))
    } else { alert('getUserMedia not supported in this browser.'); }
  };  
 
  async start_microphone(stream:MediaStream){
    this.createAudioCtx()
    this.mediaRecorder = new MediaRecorder(stream)
    console.log('starting recorder...')
    this.mediaRecorder.start(1000);

    let $this = this
    this.mediaRecorder.ondataavailable = function (e) {
      e.data.arrayBuffer().then((s:any) =>{
        console.log('byteLength', s.byteLength)
        let ds = new Float32Array(s, 0, Math.floor(s.byteLength /4))
        //let dd = Float32Array.from(s, 0, s.byteLength /4)
        //console.log("dd", ds)
        //let ds = new Float32Array(s, 4, Math.floor(s.byteLength/4) * 4)
        //console.log('conversion success; length', ds.length)
        //console.log('conversion success; byteLength', ds.byteLength)
        //console.log('ds', ds)
        //$this.chunks.push(ds);
        //ds.forEach((v, i) => $this.chunks?.push(v))
        //$this.chunks = $this.chunks.concat(ds.);
        let pp:Array<any> = []
        ds.forEach((v, i) => pp.push(v))
        $this.streamAudio(pp)
      })
      
      //$this.chunks.push(e.data);
    };

    this.gainNode = this.audioCtx!.createGain();
    //gain_node.connect( $this.audioCtx!.destination );

    this.microphone_stream = this.audioCtx!.createMediaStreamSource(stream);
    this.microphone_stream.connect(this.gainNode); 

    await this.audioCtx!.audioWorklet.addModule("/assets/audio-processor.js");
    this.processorNode = new AudioWorkletNode(this.audioCtx!, "audio-processor");
    this.microphone_stream.connect(this.processorNode);
  }

  closeStreams(){
    console.log("closing all streams")
    
    // close mic stream
    this.microphone_stream?.disconnect(this.processorNode!)
    this.processorNode = undefined

    this.microphone_stream?.disconnect(this.gainNode!)
    this.gainNode = undefined;

    navigator.mediaDevices.getUserMedia({audio: true}).then((stream) =>{
      stream.getTracks().forEach(track => track.stop())
    })

    this.mediaRecorder?.stop();
    this.audioCtx?.close()
    this.callSubject?.complete()

    //console.log("collected chunks",  this.chunks)
    //this.playData()
  }

  async playData(){
    console.log("playing...")
    console.log(this.chunks)

    this.createAudioCtx()
    this.source = this.audioCtx!.createBufferSource();

    let tmpBuffer = this.audioCtx?.createBuffer(1, this.chunks!.length, this.audioCtx.sampleRate)
    tmpBuffer?.getChannelData(0)?.set(this.chunks!, 0)

    this.source!.buffer = tmpBuffer!
    this.source!.connect(this.audioCtx!.destination)
    this.source.start()


    // const audioData = new Float32Array([0.0, 0.3, 0.6, 1.0, 0.6, 0.3, 0.0, -0.3, -0.6, -1.0, -0.6, -0.3]);
    // const audioBuffer = this.audioCtx!.createBuffer(1, audioData.length, 44100);
  }

  private createAudioCtx(){
    this.audioCtx = new AudioContext()
  }

  /**
   * plays a sound informing the user of an incoming call. If the method is called
   * with the @param stop to be true, it assumes the call tune was already
   * playing and you probably wants to stop it
   * @param stop determines whether or not to stop the calling sound
   */
  async callRinging(){
      this.disconnectSource()
      this.createAudioCtx()
      this.isRinging = true
      this.source = this.audioCtx!.createBufferSource();
      try {
        const response = await fetch("/assets/ringing.mp3");
        let bfr = await response.arrayBuffer();
        
        this.source!.buffer = await this.audioCtx!.decodeAudioData(bfr);
      } catch (err:any) {
        console.error(`Unable get call media: ${name} Error: ${err.message}`,);
      }

      this.source.loop = true
      this.source.connect(this.audioCtx!.destination)
      this.source.start()
      setTimeout(() => {
        // automaticall stop playing tone after 60secs if no answer
        if (this.callData && this.isRinging){
          this.disconnectSource()
          this.callDialog = false
          this.isCalling = false
        }
      }, 60000);
  }

  disconnectSource(){
    this.chunks = undefined
    this.source?.stop()
    //this.source?.disconnect(this.audioCtx!.destination)
    this.audioCtx?.destination.disconnect()
  }

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