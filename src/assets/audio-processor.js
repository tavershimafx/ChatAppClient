
class AudioRecorderProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
      //console.log("processing..", inputs)
      const output = outputs[0];
      output.forEach((channel) => {
        for (let i = 0; i < channel.length; i++) {
          //channel[i] = Math.random() * 2 - 1;
          channel[i] = inputs[0][i];
        }
      });
      return true;
    }
}
  
  registerProcessor("audio-processor", AudioRecorderProcessor);