import React from 'react';

export const FileSelector = ({ handleFileChange, filename }) => {
  const renderedFileName = filename ? filename : null;

  return (
    <div className="row">
      <label>
        Select MP3: {renderedFileName}
        <br />
        <br />
        <input
          id="file-upload"
          accept="audio"
          type="file"
          onChange={handleFileChange}
        />
      </label>


      <br />
    </div>
  );
};

export default FileSelector;
