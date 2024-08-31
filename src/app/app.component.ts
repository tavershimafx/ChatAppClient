import { Component, OnInit } from '@angular/core';
import * as signalR from '@microsoft/signalr'
import { ChatMessage, RecentChat } from './models/chat-models';
import { Store } from '@ngrx/store';
import { ICallRequest, UserProfile } from './models/app.models';
import { userGlobal } from './store/actions/profile.action';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  q?: string
  sError?: string
  searchUser?: string
  recentChats?: RecentChat[]
  selectedHead?: RecentChat
  currentUser?: UserProfile
  callingData?: ICallRequest

  chatDialog = false
  callDialog = false
  //inComingDialog = false
  callSubject?: signalR.Subject<any>

  connection:signalR.HubConnection;
  constructor(private store:Store){
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
      
      this.connection.onclose((e) => this.connectionClosing());
      this.connection.onreconnected((e) => this.getMessages());
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

  async newCall(visible:boolean) {
    this.callingData = { 
      receiverId: this.selectedHead?.username!,
      isCaller: true,
      connectionId: undefined,
      end: false
    }
    this.callDialog = visible
  }

  
  async streamAudio(obj: { data:any, end:boolean }){
    if (this.callSubject == undefined){
      this.callSubject = new signalR.Subject();
    }

    await this.connection.send("PlaceCall", this.callSubject);
    console.log("streaming to server", obj.data)
    this.callSubject.next(obj.data);

    if (obj.end){
      this.callSubject.complete()
      return;
    }
  }

  /**
   * 
   * @param id Id of the caller
   */
  placeCall(data: any){
    console.log("A call has been received", data)
    this.callingData = { 
      receiverId: data.receiverId,
      isCaller: false,
      connectionId: data.connectionId,
      end: data.end
    }
    
    this.callDialog = true
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