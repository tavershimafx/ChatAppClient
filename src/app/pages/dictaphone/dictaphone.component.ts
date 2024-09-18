import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';



@Component({
  selector: 'dictaphone',
  templateUrl: './dictaphone.component.html',
  styleUrls: ['./dictaphone.component.css']
})
export class DictaphoneComponent implements OnInit{
 
  @ViewChild("canvas", { static: true }) canvas!: ElementRef
  @ViewChild("mainSection", { static: true }) mainSection!: ElementRef
  @ViewChild("soundClips", { static: true }) soundClips!: ElementRef
  @ViewChild("record", { static: true }) record!: ElementRef
  @ViewChild("stop", { static: true }) stop!: ElementRef
  
  audioCtx:any;
  canvasCtx: any
  chunks:any = [];
  mediaRecorder?:MediaRecorder

  ngOnInit(): void {
    // Visualiser setup - create web audio api context and canvas

    let $this = this
    if (navigator.mediaDevices.getUserMedia) {
        console.log("The mediaDevices.getUserMedia() method is supported.");
      
        const constraints = { audio: true };
      
        let onSuccess = function (stream:any) {
          $this.mediaRecorder = new MediaRecorder(stream);
      
          $this.visualize(stream);
      
          $this.record.nativeElement.onclick = function () {
            $this.mediaRecorder!.start();
            console.log($this.mediaRecorder!.state);
            console.log("Recorder started.");
            $this.record.nativeElement.style.background = "red";
      
            $this.stop.nativeElement.disabled = false;
            $this.record.nativeElement.disabled = true;
            //$this.firedata()
          };
      
          $this.stop.nativeElement.onclick = function () {
            $this.mediaRecorder!.stop();
            console.log($this.mediaRecorder!.state);
            console.log("Recorder stopped.");
            $this.record.nativeElement.style.background = "";
            $this.record.nativeElement.style.color = "";
      
            $this.stop.nativeElement.disabled = true;
            $this.record.nativeElement.disabled = false;
          };
      
          $this.mediaRecorder.onstop = function (e:any) {
            console.log("Last data to read (after MediaRecorder.stop() called).");
      
            const clipName = prompt(
              "Enter a name for your sound clip?",
              "My unnamed clip"
            );
      
            const clipContainer = document.createElement("article");
            const clipLabel = document.createElement("p");
            const audio = document.createElement("audio");
            const deleteButton = document.createElement("button");
      
            clipContainer.classList.add("clip");
            audio.setAttribute("controls", "");
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete";
      
            if (clipName === null) {
              clipLabel.textContent = "My unnamed clip";
            } else {
              clipLabel.textContent = clipName;
            }
      
            clipContainer.appendChild(audio);
            clipContainer.appendChild(clipLabel);
            clipContainer.appendChild(deleteButton);
            $this.soundClips.nativeElement.appendChild(clipContainer);
      
            audio.controls = true;
            const blob = new Blob($this.chunks, { type: $this.mediaRecorder!.mimeType });
            $this.chunks = [];
            const audioURL = window.URL.createObjectURL(blob);
            audio.src = audioURL;
            console.log("recorder stopped");
      
            deleteButton.onclick = function (e:any) {
              e.target.closest(".clip").remove();
            };
      
            clipLabel.onclick = function () {
              const existingName = clipLabel.textContent;
              const newClipName = prompt("Enter a new name for your sound clip?");
              if (newClipName === null) {
                clipLabel.textContent = existingName;
              } else {
                clipLabel.textContent = newClipName;
              }
            };
          };
      
          //$this.mediaRecorder.stream
          
          $this.mediaRecorder.ondataavailable = function (e:any) {
            $this.chunks.push(e.data);
            console.log("pushing chunk", e.data)
          };
        };
      
        let onError = function (err:any) {
          console.log("The following error occured: " + err);
        };
      
        navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
      } else {
        console.log("MediaDevices.getUserMedia() not supported on your browser!");
      }
      
  }

  // async firedata(){
  //   while(this.mediaRecorder?.state == "recording"){
  //     this.mediaRecorder.requestData()
  //   }
  // }

  stopRecord(){
    this.mediaRecorder!.stop();
    console.log(this.mediaRecorder!.state);
    console.log("Recorder stopped.");
    this.record.nativeElement.style.background = "";
    this.record.nativeElement.style.color = "";

    this.stop.nativeElement.disabled = true;
    this.record.nativeElement.disabled = false;
  }

  visualize(stream:any) {
    let $this = this
    if (!$this.audioCtx) {
      $this.audioCtx = new AudioContext();
    }
  
    const source = $this.audioCtx.createMediaStreamSource(stream);
  
    const analyser = $this.audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
  
    source.connect(analyser);
  
    draw();
  
    function draw() {
      $this.canvasCtx = $this.canvas.nativeElement.getContext("2d");
      const WIDTH = $this.canvas.nativeElement.width;
      const HEIGHT = $this.canvas.nativeElement.height;
  
      requestAnimationFrame(draw);
  
      analyser.getByteTimeDomainData(dataArray);
  
      $this.canvasCtx.fillStyle = "rgb(200, 200, 200)";
      $this.canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  
      $this.canvasCtx.lineWidth = 2;
      $this.canvasCtx.strokeStyle = "rgb(0, 0, 0)";
  
      $this.canvasCtx.beginPath();
  
      let sliceWidth = (WIDTH * 1.0) / bufferLength;
      let x = 0;
  
      for (let i = 0; i < bufferLength; i++) {
        let v = dataArray[i] / 128.0;
        let y = (v * HEIGHT) / 2;
  
        if (i === 0) {
          $this.canvasCtx.moveTo(x, y);
        } else {
          $this.canvasCtx.lineTo(x, y);
        }
  
        x += sliceWidth;
      }
  
      $this.canvasCtx.lineTo($this.canvas.nativeElement.width, $this.canvas.nativeElement.height / 2);
      $this.canvasCtx.stroke();
    }
  }
}