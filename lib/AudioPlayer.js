import { SimpleFilter, SoundTouch } from 'soundtouchjs';

import make_download from '../src/utils/make_download';

const BUFFER_SIZE = 4096;

export default class AudioPlayer {
  constructor({ emitter, pitch, tempo }) {
    this.emitter = emitter;
    this.context = new (window.AudioContext || window.webkitAudioContext)();

    // Offline Stuff
    this.offlineAudioCtx = null;
    this.offlineSource = null;

    this.samples = new Float32Array(BUFFER_SIZE * 2);

    this.scriptProcessor = this.context.createScriptProcessor(
      BUFFER_SIZE,
      2,
      2
    );
    // When the Web AUdio Script Processor node gets called with audio to process
    // Get the L R Audio Data from e.outputBuffer
    // Call simpleFilter.extract() which calls the source.extract() that we defined earlier.
    // pass in the Float32 Array this.samples() as the target to which will be filled with the shifted data
    //  the second parameter is used as numFrames. idk what that is

    // Every time there is new audio to process (every BUFFER_SIZE new bytes) this will be called

    this.scriptProcessor.onaudioprocess = e => {
      const l = e.outputBuffer.getChannelData(0);
      const r = e.outputBuffer.getChannelData(1);
      // console.log("before", {l})
      const framesExtracted = this.simpleFilter.extract(
        this.samples,
        BUFFER_SIZE
      );
      if (framesExtracted === 0) {
        this.emitter.emit('stop');
      }
      // this assignment is going straight to output
      for (let i = 0; i < framesExtracted; i++) {
        l[i] = this.samples[i * 2];
        r[i] = this.samples[i * 2 + 1];
      }
    };

    //
    this.soundTouch = new SoundTouch();
    this.soundTouch.pitch = pitch;
    this.soundTouch.tempo = tempo;

    this.duration = 0;
  }

  get pitch() {
    return this.soundTouch.pitch;
  }
  set pitch(pitch) {
    this.soundTouch.pitch = pitch;
  }

  get tempo() {
    return this.soundTouch.tempo;
  }
  set tempo(tempo) {
    this.soundTouch.tempo = tempo;
  }

  // Gives you back the buffer
  decodeAudioData(data) {
    return this.context.decodeAudioData(data);
  }

  setBuffer(buffer) {
    // Normal stuff
    // const bufferSource = this.context.createBufferSource();
    // bufferSource.buffer = buffer;

    // This gets the audio data from the Buffer and puts it into Soundtouch
    // Passing source and this.soundTouch into this.simpleFilter
    // source needs a .extract fn because you will be calling it later

    // this.samples = new Float32Array(BUFFER_SIZE * 2);

    // WTF? source.extract vs this.simpleFilter.extract() ?!?!?!?!
    const extractFn = this.createExtractFn(buffer);
    this.simpleFilter = new SimpleFilter(extractFn, this.soundTouch);
    this.duration = buffer.duration;


    // Misc Logging
    // console.log(this.offlineAudioCtx, this.context, buffer, source);
    this.emitter.emit('state', { duration: buffer.duration });
  }


  // Soundtouch Simplefilter needs the extract cb function here to define behavior in SimpleFilter.fillInputBuffer()
  createExtractFn(buffer) {
    return ({
      extract: (target, numFrames, position) => {
        this.emitter.emit('state', { t: position / this.context.sampleRate });
        const l = buffer.getChannelData(0);
        const r = buffer.getChannelData(1);
        for (let i = 0; i < numFrames; i++) {
          // target is this.samples
          target[i * 2] = l[i + position];
          target[i * 2 + 1] = r[i + position];
        }
        // console.log(target, this.samples);
        return Math.min(numFrames, l.length - position);
      }
    });
  }

  offlineStuff(buffer, file) {
    // Offline audioctx stuff
    this.offlineAudioCtx = new OfflineAudioContext({
      numberOfChannels: 2,
      length: 44100 * buffer.duration,
      sampleRate: 44100
    });

    // const offlineSource = this.offlineAudioCtx.createBufferSource();
    this.offlineSource = this.offlineAudioCtx.createBufferSource();
    this.offlineSource.buffer = buffer;
    this.offlineSource.connect(this.offlineAudioCtx.destination);

    const reader2 = new FileReader();
    reader2.onload = e => {
      this.offlineAudioCtx
        .startRendering()
        .then(renderedBuffer => {
          console.log({ renderedBuffer }, this.offlineAudioCtx.length);
          make_download(renderedBuffer, this.offlineAudioCtx.length);
        })
        .catch(err => console.log(err));
    };
    // console.log(this.offlineAudioCtx, this.context, buffer, source);

    reader2.readAsArrayBuffer(file); // Added by Russell
    this.offlineSource.start(0); // Added by Russell
  }

  download() {
    // console.log(this.context, this.offlineAudioCtx)
  }

  play() {
    this.scriptProcessor.connect(this.context.destination);
  }

  pause() {
    this.scriptProcessor.disconnect(this.context.destination);
  }

  seekPercent(percent) {
    if (this.simpleFilter !== undefined) {
      this.simpleFilter.sourcePosition = Math.round(
        (percent / 100) * this.duration * this.context.sampleRate
      );
    }
  }
}
