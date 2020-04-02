const React = require('react');

const TrackControls = ({ action, error, filename, onPlayOrPause, onStop }) => {
  const disabled = error !== undefined || filename === undefined;

  const isPlaying = action === 'play' ? true : false;

  const renderedPlayButton = (
    <button disabled={disabled} onClick={onPlayOrPause}>
      {isPlaying ? 'Pause' : 'Play'}
    </button>
  );

  return (
    <div>
      {renderedPlayButton}
      <button
        disabled={disabled}
        onClick={onStop}
      >
        Stop
      </button>
    </div>
  );
};

module.exports = TrackControls;
