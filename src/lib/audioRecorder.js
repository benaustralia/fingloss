class AudioRecorder {
  constructor(input, websocket, options = {}, callback) {
    this.input = input;
    this.websocket = websocket;
    this.options = options;
    this.callback = callback;
    this.recording = false;
    this.processor = null;
    this.audioChunks = [];
  }

  start(sentences) {
    if (this.recording) return;
    
    this.recording = true;
    this.audioChunks = [];
    
    // Create audio processor
    this.processor = this.input.context.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (event) => {
      if (!this.recording) return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      const volume = this.calculateVolume(inputData);
      
      // Send volume data for real-time feedback
      this.callback({ volume });
      
      // Store audio data
      this.audioChunks.push(new Float32Array(inputData));
    };
    
    this.input.connect(this.processor);
    this.processor.connect(this.input.context.destination);
    
    // Send start message to server
    this.websocket.send(JSON.stringify({
      type: 'start',
      sentences: sentences
    }));
  }

  stop() {
    if (!this.recording) return;
    
    this.recording = false;
    
    if (this.processor) {
      this.processor.disconnect();
    }
    
    // Convert audio chunks to blob
    const audioBlob = this.createAudioBlob();
    
    // Send audio data to server
    this.websocket.send(JSON.stringify({
      type: 'audio',
      data: audioBlob
    }));
    
    this.callback({ audio: audioBlob });
  }

  calculateVolume(inputData) {
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    return Math.sqrt(sum / inputData.length);
  }

  createAudioBlob() {
    // Convert Float32Array chunks to WAV format
    const length = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 44100, true);
    view.setUint32(28, 44100 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (const chunk of this.audioChunks) {
      for (let i = 0; i < chunk.length; i++) {
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
}

export default AudioRecorder;
