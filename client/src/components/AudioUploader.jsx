import React, { useRef, useState } from 'react';
import './AudioUploader.css';

const AudioUploader = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = (files) => {
    const audioFiles = Array.from(files).filter(file => {
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
      return validTypes.includes(file.type) || file.name.match(/\.(mp3|wav|ogg|m4a)$/i);
    });

    if (audioFiles.length === 0) {
      alert('Por favor, selecione apenas arquivos de áudio válidos (MP3, WAV, OGG, M4A)');
      return;
    }

    audioFiles.forEach(file => {
      onFileUpload(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="audio-uploader">
      <div 
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept="audio/*,.mp3,.wav,.ogg,.m4a"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        
        <div className="upload-icon">📁</div>
        <p className="upload-text">
          {isDragging ? (
            <strong>Solte os arquivos aqui</strong>
          ) : (
            <>
              <strong>Clique</strong> ou <strong>arraste</strong> arquivos de áudio
            </>
          )}
        </p>
        <p className="upload-hint">MP3, WAV, OGG, M4A</p>
      </div>
    </div>
  );
};

export default AudioUploader;

