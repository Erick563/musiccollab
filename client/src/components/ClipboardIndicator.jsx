import React from 'react';
import './ClipboardIndicator.css';

const ClipboardIndicator = ({ clipboardData, onClear }) => {
  if (!clipboardData) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const duration = clipboardData.region.end - clipboardData.region.start;

  return (
    <div className="clipboard-indicator">
      <div className="clipboard-indicator-icon">📋</div>
      <div className="clipboard-indicator-content">
        <div className="clipboard-indicator-title">
          Região copiada
        </div>
        <div className="clipboard-indicator-details">
          {clipboardData.trackName} ({formatTime(clipboardData.region.start)} - {formatTime(clipboardData.region.end)})
        </div>
        <div className="clipboard-paste-hint">
          Pressione <kbd>Ctrl+V</kbd> para colar
        </div>
      </div>
      <button 
        className="clipboard-indicator-close"
        onClick={onClear}
        title="Limpar clipboard"
      >
        ×
      </button>
    </div>
  );
};

export default ClipboardIndicator;

