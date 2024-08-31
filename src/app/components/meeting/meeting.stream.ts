import { EOF } from '@angular/compiler';
import * as signalR from '@microsoft/signalr'
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.css']
})
export class OldMeetingComponent implements OnInit, OnDestroy {
  @Input() user: string = "sm"
  @ViewChild("audioEl", { static: true }) audioEl!: ElementRef
  @ViewChild("playBtn", { static: true }) playBtn!: ElementRef
  @ViewChild("vol", { static: true }) vol!: ElementRef
  @ViewChild("pan", { static: true }) pan!: ElementRef
  @ViewChild("fileDiag", { static: true }) fileDiag!: ElementRef
  @ViewChild("fileInput", { static: false }) fileInput!: ElementRef
  @Input() endMeet?: boolean
  @Output() endMeetChange: EventEmitter<boolean> = new EventEmitter()
  @Output() sendChunk: EventEmitter<any> = new EventEmitter()

  callConnected = false
  callerConnection?: string
  audioFileBuffer?: Uint8Array

  audioDialog = false
  fileName?: string

  // Create AudioContext and buffer source
  audioCtx?:AudioContext; 

  aContext = new AudioContext()
  track?: MediaElementAudioSourceNode
  arrayBuffer?: ArrayBuffer
  source?: AudioBufferSourceNode

  gainNode?: any
  panner?: any
  pannerOptions = { pan: 0 }


  constructor(){
  }

  ngOnInit(): void {
   //this.init()
   this.startConnection();
  }

  ngOnDestroy(): void {
   this.audioCtx = undefined
  }

  endCall(){
    this.endMeetChange.emit(true)
  }
  
  newAudio(close:boolean){
    this.audioDialog = close
  }
  
  openSelect(){
    this.fileInput.nativeElement.click()
  }

  selectFile(){
    let files = this.fileInput.nativeElement.files
    let reader = new FileReader()
    reader.onload = (e) =>{
      let f = reader.result as ArrayBuffer
      this.audioFileBuffer = new Uint8Array(f, 0, f.byteLength)
    }

    this.fileName = files[0].name
    reader.readAsArrayBuffer(files[0])
  }


  async startStream(){
    // const response = await fetch("/assets/knock_0b1ea.ogg");
    // let fer = await response.arrayBuffer();
    
    // let adata = await this.aContext.decodeAudioData(fer)
    // let ds = adata.getChannelData(1)
    //this.sendChunk.emit(this.audioFileBuffer)
    
    //this.uploadBtn()
    //console.log(this.audioFileBuffer)
  }

  async createSource(){
    this.source = this.aContext.createBufferSource();
    try {
      //const response = await fetch("https://s3-us-west-2.amazonaws.com/s.cdpn.io/858/outfoxing.mp3");
      const response = await fetch("/assets/acoustic-guitar-short-intro-ish-live-recording-163329.mp3");
      this.arrayBuffer = await response.arrayBuffer();
      
      this.source.buffer = await this.aContext.decodeAudioData(this.arrayBuffer);
    } catch (err:any) {
      console.error(`Unable to fetch the audio file: ${name} Error: ${err.message}`,);
    }

    this.source.connect(this.aContext.destination)
    let l = this.source.buffer?.duration! * 1000;

    try {
      const response = await fetch("/assets/dark-engine-logo-141942.mp3");
      this.arrayBuffer = await response.arrayBuffer();
      
    } catch (err:any) {
      console.error(`Unable to fetch the audio file: ${name} Error: ${err.message}`,);
    }

   setTimeout(async () => {
      this.source!.disconnect(this.aContext.destination)

      // let a = await this.aContext.decodeAudioData(this.arrayBuffer!)
      // let ar = a.getChannelData(1)
      

      this.source = this.aContext.createBufferSource();
      this.source!.buffer = await this.aContext.decodeAudioData(this.arrayBuffer!)
      this.source!.connect(this.aContext.destination)
      this.source.start()
    }, l);
    

    // this.track = this.aContext.createMediaElementSource(this.audioEl.nativeElement)
    // this.gainNode = this.aContext.createGain()
    // this.panner = new StereoPannerNode(this.aContext, this.pannerOptions)
    //this.source.connect(this.gainNode).connect(this.panner).connect(this.aContext.destination)
  }

  async playPause(){
    this.createSource()
    if (this.aContext.state === "suspended"){
      await this.aContext.resume()
    }

    if (this.playBtn.nativeElement.dataset.playing === "false"){
      //this.audioEl.nativeElement.play();
      this.playBtn.nativeElement.dataset.playing = "true"

      this.source?.start()
    }else if (this.playBtn.nativeElement.dataset.playing === "true"){
      //this.audioEl.nativeElement.pause()
      this.playBtn.nativeElement.dataset.playing = "false"

      this.source?.stop()
    }
  }

  setStop(){
    this.audioEl.nativeElement.dataset.playing = false
  }

  volChange(){
    this.gainNode.gain.value = this.vol.nativeElement.value
  }

  panChange(){
    this.panner.pan.value = this.pan.nativeElement.value
  }

  // async webaudio_tooling_obj() {

  //   var audioContext = new AudioContext();

  //   console.log("audio is starting up ...");

  //   var BUFF_SIZE = 1024//16384;

  //   var audioInput = null,
  //       microphone_stream:any = null,
  //       gain_node:any = null,
  //       script_processor_node = null,
  //       script_processor_fft_node = null,
  //       analyserNode:any = null;

  //   // if (!navigator.mediaDevices.getUserMedia())
  //   //         navigator.mediaDevices = navigator.getUserMedia || navigator.webkitGetUserMedia ||
  //   //                       navigator.mozGetUserMedia || navigator.msGetUserMedia;

  //   if (await navigator.mediaDevices.getUserMedia({audio:true, video: false})){

  //     console.log("navigator is present")
  //     start_microphone(await navigator.mediaDevices.getUserMedia({audio:true, video: false}))
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

  //       //show_some_data(microphone_output_buffer, 5, "from getChannelData");
  //   }

  //   function start_microphone(stream:any){

  //     gain_node = audioContext.createGain();
  //     gain_node.connect( audioContext.destination );

  //     //var ms:MediaStreamAudioSourceNode = audioContext.createMediaStreamSource(stream);
  //     //ms.connect()
  //     microphone_stream = audioContext.createMediaStreamSource(stream);
  //     microphone_stream.connect(gain_node); 

  //     script_processor_node = audioContext.createScriptProcessor(BUFF_SIZE, 1, 1);
  //     script_processor_node.onaudioprocess = process_microphone_buffer;

  //     microphone_stream.connect(script_processor_node);

  //     // --- enable volume control for output speakers
          
  //     // document.getElementById('volume').addEventListener('change', function() {

  //     //     var curr_volume = this.value;
  //     //     gain_node.gain.value = curr_volume;

  //     //     console.log("curr_volume ", curr_volume);
  //     // });

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

  //           //show_some_data(array, 5, "from fft");
  //       }
  //     };
  //   }

  // };  
 


  async init() {
    this.audioCtx = new AudioContext();
    const source = this.audioCtx.createBufferSource();

    // Create a ScriptProcessorNode with a bufferSize of 4096 and
    // a single input and output channel
    const scriptNode = this.audioCtx.createScriptProcessor(4096, 1, 1);

    // Load in an audio track using fetch() and decodeAudioData()
    try {
      //const response = await fetch("viper.ogg");
      const response = await fetch("https://s3-us-west-2.amazonaws.com/s.cdpn.io/858/outfoxing.mp3");
      const arrayBuffer = await response.arrayBuffer();
      source.buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    } catch (err:any) {
      console.error(
        `Unable to fetch the audio file: ${name} Error: ${err.message}`,
      );
    }

    // Give the node a function to process audio events
    scriptNode.addEventListener("audioprocess", (audioProcessingEvent:AudioProcessingEvent) => {
      // The input buffer is the song we loaded earlier
      let inputBuffer = audioProcessingEvent.inputBuffer;

      // The output buffer contains the samples that will be modified and played
      let outputBuffer = audioProcessingEvent.outputBuffer;

      // Loop through the output channels (in this case there is only one)
      for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
        let inputData = inputBuffer.getChannelData(channel);
        let outputData = outputBuffer.getChannelData(channel);

        // Loop through the 4096 samples
        for (let sample = 0; sample < inputBuffer.length; sample++) {
          // make output equal to the same as the input
          outputData[sample] = inputData[sample];

          // add noise to each output sample
          //outputData[sample] += (Math.random() * 2 - 1) * 0.1;
        }
      }
    });

    source.connect(scriptNode);
    scriptNode.connect(this.audioCtx.destination);
    source.start();

    // When the buffer source stops playing, disconnect everything
    source.addEventListener("ended", () => {
      source.disconnect(scriptNode);
      scriptNode.disconnect(this.audioCtx?.destination!);
    });
  }


  streamConnection = new signalR.HubConnectionBuilder()
  .withUrl("https://localhost:7225/streamHub")
  .build();

  async startConnection() {
    try {
        await this.streamConnection.start();
    } catch (e:any) {
        console.error(e.toString());
    }
  }

  streamBtn(){
    try {
    this.streamConnection.stream("Counter", 10, 500)
          .subscribe({
              next: (item) => {
                  console.log(item);
              },
              complete: () => {
                console.log("Stream completed");
              },
              error: (err) => {
                  console.log(err)
              },
          });
    } catch (e:any) {
      console.error(e.toString());
    }
  }

  async uploadBtn(){
    const subject = new signalR.Subject();
    await this.streamConnection.send("UploadStream", subject);

    let content = new Uint8Array(this.audioFileBuffer!, 0, this.audioFileBuffer?.byteLength)
    const c_size = 3000
    for (let i = 0; i < content.length; i += c_size) {
      let off = i + c_size;
      let chunk = content.subarray(i, off)
      subject.next(chunk);
    }
    subject.complete();
  }

}
