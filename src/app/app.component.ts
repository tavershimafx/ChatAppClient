import { Component, OnInit } from '@angular/core';
import * as signalR from '@microsoft/signalr'
import { ChatMessage, RecentChat } from './models/chat-models';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  q?: string
  message?: string
  sError?: string
  searchUser?: string
  recentChats?: RecentChat[]
  selectedUser?: RecentChat
  currentUser?: string
  dialogVisible = false

  connection:signalR.HubConnection;
  constructor(){
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
      this.connection.on("OnlineStatus", this.onlineStatus);
      this.connection.on("IsUser",  (d) => this.isUser(d));
      this.connection.on("DeliveryReport",  (d) => this.deliveryReport(d));
      
      this.connection.onclose((e) => this.connectionClosing());
      this.connection.onreconnected((e) => this.getMessages());
  }

  newChat(visible:boolean) {
    if(!visible){
      this.searchUser = undefined
    }
    
    this.dialogVisible = visible
  }

  sUsr(e:KeyboardEvent){
    if(e.key == "Enter") this.isUser(this.searchUser)
  }

  loadUser(head:RecentChat){
    this.selectedUser = head
  }

  loadMessages(username:string, recentChats:RecentChat[]) {
    this.currentUser = username

    this.recentChats = recentChats;
  }

  /**
   * Show the online status of a user
   * @param status 
   */
  onlineStatus(status:any) {
    
  }

  isUser(data: string | any){
    this.sError = undefined
    if(typeof(data) == "string"){
      this.connection.invoke("IsUser", data).catch(function (err) {
        return console.error(err.toString());
      });
    }else{
      if(data.valid){
        this.selectedUser = new RecentChat()
        this.selectedUser.username = data.username
        this.selectedUser.displayName = data.username
        this.newChat(false)
        this.loadUser(this.selectedUser)
      }else{
        this.sError = data.msg
      }
    }
  }

  /**
   * Check if a user is online
   * @param userId 
   */
  isOnline(userId:any) {
    this.connection.invoke("IsOnline", userId).catch(function (err) {
      return console.error(err.toString());
    });
  }

  showEmoji(){

  }

  kmsg(e:KeyboardEvent){
    if(e.key == "Enter") this.sendMessage()
  }

  sendMessage(){
    if (this.message?.trim() != ""){
      let msg = new ChatMessage()
      msg.message = this.message
      msg.senderId = this.currentUser
      
      this.connection.invoke("SendMessage", this.selectedUser?.username, msg).catch(function (err) {
        return console.error(err.toString());
      });

      this.recentChats?.find(k => k.username == this.selectedUser?.username)?.chats?.push(msg)
      this.message = undefined
    }
  }

  deliveryReport(message:ChatMessage) {
    console.log("delivered", message)
    let ch = this.recentChats?.find(k => k.senderId == message.senderId)?.chats?.find(r => r.ref == message.ref);
    ch!.id = message.id
  }

  readReceipt(message:ChatMessage) {
    console.log("chatRead", message)
    let ch = this.recentChats?.find(k => k.senderId == message.senderId)?.chats?.find(r => r.id == message.id);
    ch!.isRead = message.isRead
    ch!.readTime = message.readTime
  }

  receiveMessage(message:ChatMessage) {
    let us = this.recentChats?.find(u => u.username == message.senderId)
    if (us != null){
      this.recentChats?.find(u => u.username == message.senderId)!.chats?.push(message)
    }else{
      let rc = new RecentChat()
      rc.displayName = message.senderId
      rc.isOnline = true
      rc.lastActiveTime = message.sentTime
      rc.lastMessage = message.message
      rc.username = message.senderId
      rc.chats = new Array<ChatMessage>()
      rc.chats.push(message)

      if(!this.recentChats) this.recentChats = new Array<RecentChat>()
      this.recentChats.push(rc)
    }
  }

  getMessages(){
    this.connection.invoke("LoadMessages").catch(function (err) {
      return console.error(err.toString());
    });
  }

  connectionClosing(){

  }

  async start() {
      try {
          await this.connection.start();
          console.log("SignalR Connected.");
          setTimeout(() => {
            this.getMessages()
          }, 1000);
      } catch (err) {
          setTimeout(this.start, 5000);
      }
  };

  // webaudio_tooling_obj() {

  //   var audioContext = new AudioContext();

  //   console.log("audio is starting up ...");

  //   var BUFF_SIZE = 16384;

  //   var audioInput = null,
  //       microphone_stream = null,
  //       gain_node = null,
  //       script_processor_node = null,
  //       script_processor_fft_node = null,
  //       analyserNode = null;

  //   if (!navigator.getUserMedia)
  //           navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
  //                         navigator.mozGetUserMedia || navigator.msGetUserMedia;

  //   if (navigator.getUserMedia){

  //       navigator.getUserMedia({audio:true}, 
  //         function(stream:any) {
  //             start_microphone(stream);
  //         },
  //         function(e) {
  //           alert('Error capturing audio.');
  //         }
  //       );

  //   } else { alert('getUserMedia not supported in this browser.'); }

  //   // ---

  //   function show_some_data(given_typed_array:any, num_row_to_display:any, label:any) {

  //       var size_buffer = given_typed_array.length;
  //       var index = 0;
  //       var max_index = num_row_to_display;

  //       console.log("__________ " + label);

  //       for (; index < max_index && index < size_buffer; index += 1) {

  //           console.log(given_typed_array[index]);
  //       }
  //   }

  //   function process_microphone_buffer(event:any) { // invoked by event loop

  //       var i, N, inp, microphone_output_buffer;

  //       microphone_output_buffer = event.inputBuffer.getChannelData(0); // just mono - 1 channel for now

  //       // microphone_output_buffer  <-- this buffer contains current gulp of data size BUFF_SIZE

  //       show_some_data(microphone_output_buffer, 5, "from getChannelData");
  //   }

  //   function start_microphone(stream:any){

  //     gain_node = audioContext.createGain();
  //     gain_node.connect( audioContext.destination );

  //     microphone_stream = audioContext.createMediaStreamSource(stream);
  //     microphone_stream.connect(gain_node); 

  //     script_processor_node = audioContext.createScriptProcessor(BUFF_SIZE, 1, 1);
  //     script_processor_node.onaudioprocess = process_microphone_buffer;

  //     microphone_stream.connect(script_processor_node);

  //     // --- enable volume control for output speakers
          
  //     document.getElementById('volume').addEventListener('change', function() {

  //         var curr_volume = this.value;
  //         gain_node.gain.value = curr_volume;

  //         console.log("curr_volume ", curr_volume);
  //     });

  //     // --- setup FFT

  //     script_processor_fft_node = audioContext.createScriptProcessor(2048, 1, 1);
  //     script_processor_fft_node.connect(gain_node);

  //     analyserNode = audioContext.createAnalyser();
  //     analyserNode.smoothingTimeConstant = 0;
  //     analyserNode.fftSize = 2048;

  //     microphone_stream.connect(analyserNode);

  //     analyserNode.connect(script_processor_fft_node);

  //     script_processor_fft_node.onaudioprocess = function() {

  //       // get the average for the first channel
  //       var array = new Uint8Array(analyserNode.frequencyBinCount);
  //       analyserNode.getByteFrequencyData(array);

  //       // draw the spectrogram
  //       if (microphone_stream.playbackState == microphone_stream.PLAYING_STATE) {

  //           show_some_data(array, 5, "from fft");
  //       }
  //     };
  //   }

  // };  
  //webaudio_tooling_obj = function()
}
