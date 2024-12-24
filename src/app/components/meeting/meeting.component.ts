import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
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

  muteAudio: boolean = false
  @ViewChild("localVideo", {static: true}) localVideo!: ElementRef
  @ViewChild("localAudio", {static: true}) localAudio!: ElementRef

  @Input() endMeet?: boolean
  @Output() endMeetChange: EventEmitter<boolean> = new EventEmitter()
  @Output() receiveCall: EventEmitter<boolean> = new EventEmitter()

  @Output() sendOffer: EventEmitter<any> = new EventEmitter()
  @Output() sendAnswer: EventEmitter<any> = new EventEmitter()
  @Output() sendIce: EventEmitter<any> = new EventEmitter()

  constructor(){
    this.createIceCandidate = this.createIceCandidate.bind(this)
    this.offerCreated = this.offerCreated.bind(this)
    //this.sendOffer = this.sendOffer.bind(this)
    this.receiveAnswer = this.receiveAnswer.bind(this)
    this.receiveOffer = this.receiveOffer.bind(this)
    this.answerCreated = this.answerCreated.bind(this)
    //this.sendAnswer = this.sendAnswer.bind(this)
    this.createDataChannel = this.createDataChannel.bind(this)
    this.gotLocalMediaStream = this.gotLocalMediaStream.bind(this)
    this.gotRemoteTrack = this.gotRemoteTrack.bind(this)
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


  
  // region RTC Connection
  localConnection?: RTCPeerConnection
  dataChannel?: RTCDataChannel
  servers: any = null
  
  offerOptions:RTCOfferOptions = {  offerToReceiveAudio: true, offerToReceiveVideo: true };
  //answerOptions:RTCAnswerOptions = { offerToReceiveVideo: true };
  mediaStreamConstraints = { video: false, audio: true };
  localStream?:MediaStream

  getMediaStream() {
    navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints)
      .then(this.gotLocalMediaStream).catch(this.handleLocalMediaStreamError);
  }

  gotLocalMediaStream(mediaStream:MediaStream) {
    console.log('local stream.', mediaStream);
    //this.localVideo.nativeElement.srcObject = mediaStream
    this.localStream = mediaStream;
  }

  handleLocalMediaStreamError(error:any) {
    console.log(`navigator.getUserMedia error: ${error.toString()}.`);
  }

  startConnection(){
    this.getMediaStream()
    this.muteAudio = true
    setTimeout(() => {
      this.localConnection = new RTCPeerConnection(this.servers);
      this.dataChannel = this.localConnection.createDataChannel("channel")
      this.dataChannel.onmessage = this.showChannelMessage
      this.dataChannel.onopen = e => console.log("connection Opened!!!!")

      this.localConnection.onicecandidate = this.createIceCandidate 
      
      console.log("adding track to connection")
      let tr = this.localStream?.getTracks()[0]
      this.localConnection!.addTrack(tr!, this.localStream!)
      
      this.localConnection.createOffer(this.offerOptions).then(this.offerCreated)
    }, 1000);
  }
  
  receiveOffer(offer: string){
    console.log("Received offer", offer)
    this.localConnection = new RTCPeerConnection(this.servers)
    
    this.localConnection.onicecandidate = this.createIceCandidate
    this.localConnection.ontrack = this.gotRemoteTrack
    this.localConnection.ondatachannel = this.createDataChannel
    this.localConnection?.setRemoteDescription(JSON.parse(offer)).then(a => console.log("offer set!"))
    this.localConnection.createAnswer().then(this.answerCreated)
  }

  audioCtx?: AudioContext
  audioSourceNode?: MediaStreamAudioSourceNode
  audioWorker?: AudioWorkletNode
  gainNode?: GainNode

  createAudioContext(){
    this.audioCtx = new AudioContext()
    this.gainNode = this.audioCtx.createGain()
    this.gainNode.gain.value = 1
    // this.audioWorker = new AudioWorkletNode(this.audioCtx, "audio-processor")
    // this.audioCtx.audioWorklet.addModule("/assets/audio-processor.js")

    // this.audioWorker.connect(this.gainNode)
    // this.gainNode.connect(this.audioCtx.destination)
  }

  gotRemoteTrack(event: RTCTrackEvent){
    if (!this.audioCtx){
      this.createAudioContext()
    }

    this.audioSourceNode = this.audioCtx?.createMediaStreamSource(event.streams[0])
    this.audioSourceNode?.connect(this.audioCtx!.destination)
    

    console.log('received remote stream', event);
    
    //this.localAudio.nativeElement.srcObject = event.streams[0];
  }

  receiveAnswer(answer: string){
    this.localConnection?.setRemoteDescription(JSON.parse(answer)).then(a => console.log("Remote description set"))
  }

  offerCreated(offer:RTCSessionDescriptionInit){
    console.log("setting local description...", offer)
    this.localConnection!.setLocalDescription(offer).then(a => console.log("Local description set"))

    this.sendOffer.emit(offer);
  }
  
  offerCreateFailed(fail:any){
    console.log("Failed to create local connection offer ", fail)
  }

  answerCreated(answer:RTCSessionDescriptionInit){
    console.log("answer created. Setting local description...", answer)
    this.localConnection?.setLocalDescription(answer).then(a => console.log("Remote description set"))

    this.sendAnswer.emit(answer);
  }

  createDataChannel(e:RTCDataChannelEvent){
    this.dataChannel = e.channel
    this.dataChannel.onmessage = this.showChannelMessage
    this.dataChannel.onopen = e => console.log("connection Opened!!!!")
  }

  createIceCandidate(e:RTCPeerConnectionIceEvent){
    console.log("Ice candidate fired", e)
    this.sendIce.emit(e.candidate);
  }

  addIceConnection(candidate: string){
    console.log("Received Ice candidate", candidate)
    this.localConnection?.addIceCandidate(JSON.parse(candidate)).then(() => { console.log("Ice candidate set")})
  }

  showChannelMessage(e:any){
    console.log("Received new message", e)
  }

  onloadedmetadata() {
    console.log(`Remote video videoWidth: ${this.localVideo.nativeElement.videoWidth}px,  videoHeight: ${this.localVideo.nativeElement.videoHeight}px`);
  };
  // end region
}
