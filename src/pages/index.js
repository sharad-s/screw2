import React from 'react';

// Next
import Head from 'next/head';
import dynamic from 'next/dynamic';

// AudioPlayer
// const AudioPlayer = dynamic(() => import '../../lib/AudioPlayer', {ssr: false})
// const AudioPlayer =
import AudioPlayer from '../../lib/AudioPlayer';
import Emitter from 'events';

// Components
import FileSelector from '../components/FileSelector';
import TrackControls from '../components/TrackControls';

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      action: 'stop',
      error: undefined,
      filename: undefined,
      pitch: 0.8,
      tempo: 0.8,
      status: [],
      t: 0,
      duration: undefined,
      granularSliders: false
    };

    // Emitter
    this.emitter = new Emitter.EventEmitter();
    this.emitter.on('state', state => this.setState(state));
    this.emitter.on('status', status => {
      if (status === 'Done!') {
        this.setState({ status: [] });
      } else {
        this.setState({ status: this.state.status.concat(status) });
      }
    });
    this.emitter.on('stop', () => this.stop());

    this.audioPlayer = null;
  }

  componentDidMount() {
    this.audioPlayer = new AudioPlayer({
      emitter: this.emitter,
      pitch: this.state.pitch,
      tempo: this.state.tempo
    });
  }

  componentWillUnmount() {
    this.audioPlayer = null;
  }

  playOrPause = () => {
    const isPlaying = this.state.action === 'play' ? true : false;
    return isPlaying ? this.pause() : this.play();
  };

  play = () => {
    if (this.state.action !== 'play') {
      this.audioPlayer.play();
      this.setState({ action: 'play' });
    }
  };

  pause = () => {
    if (this.state.action === 'play') {
      this.audioPlayer.pause();
      this.setState({ action: 'pause' });
    }
  };

  stop = () => {
    this.pause();
    this.audioPlayer.seekPercent(0);
    this.setState({ action: 'stop', t: 0 });
  };

  testHandleFileChange = e => {
    return this.handleFileChange(null, filename);
  };

  handleFileChange = (e, name) => {
    if (e.target.files.length > 0) {
      this.stop();

      this.emitter.emit('state', {
        error: undefined,
        filename: undefined
      });

      // http://stackoverflow.com/q/4851595/786644
      const filename = e.target.value.replace('C:\\fakepath\\', '');
      this.emitter.emit('state', { filename });
      console.log({ e, filename });

      const file = e.target.files[0];
      return this._readFile(file);
    }
  };

  _readFile(file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async event => {
      this.emitter.emit('status', 'Playing file...');

      let buffer;
      try {
        buffer = await this.audioPlayer.decodeAudioData(event.target.result);
      } catch (err) {
        return console.error(err);
      }

      this.audioPlayer.setBuffer(buffer);
      this.play();
    };
  }

  handlePitchAndTempoChange(e) {
    const { value } = e.target;
    this.audioPlayer.pitch = value;
    this.audioPlayer.tempo = value;
    this.setState({ pitch: value, tempo: value });
  }

  handleSeek = e => {
    const percent = parseFloat(e.target.value);
    this.audioPlayer.seekPercent(percent);
    this.play();
  };

  percentDone() {
    if (!this.state.duration) {
      return 0;
    }
    return (this.state.t / this.state.duration) * 100;
  }

  handleDownload = e => {
    e.preventDefault();
    this.audioPlayer.download();
  };

  render() {
    const { filename, duration } = this.state;
    return (
      <>
        <FileSelector
          handleFileChange={this.handleFileChange}
          filename={filename}
        />
        <div className="row">
          <p>Speed ({this.state.tempo}x)</p>
          <div className="slider">
            <input
              className="form-control"
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              defaultValue={this.state.tempo}
              onChange={e => this.handlePitchAndTempoChange(e)}
            />
          </div>
          <p>Seek ({Math.floor(this.percentDone())}%)</p>

          <input
            type="range"
            min="0"
            max="100"
            step="0.05"
            value={this.percentDone()}
            onChange={this.handleSeek}
          />
          <TrackControls
            action={this.state.action}
            error={this.state.error}
            filename={this.state.filename}
            onPlayOrPause={this.playOrPause}
            onStop={() => this.stop()}
          />
          <p> Duration: {duration}</p>
          <br />
          <br />
          <button onClick={this.handleDownload}>Download</button>
          <a id="download_link"></a>
        </div>
      </>
    );
  }
}

export default Home;
