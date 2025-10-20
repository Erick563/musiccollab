import React, { useState } from 'react';
import './MarkerSystem.css';

const MarkerSystem = ({ duration, currentTime, markers, onAddMarker, onDeleteMarker, onSeekToMarker }) => {
  const [showInput, setShowInput] = useState(false);
  const [markerName, setMarkerName] = useState('');

  const handleAddMarker = () => {
    if (markerName.trim()) {
      onAddMarker({
        id: Date.now(),
        time: currentTime,
        name: markerName.trim(),
        color: getRandomColor()
      });
      setMarkerName('');
      setShowInput(false);
    }
  };

  const getRandomColor = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#a29bfe', '#fd79a8', '#00d4ff'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="marker-system">
      <div className="marker-toolbar">
        <button 
          className="add-marker-btn"
          onClick={() => setShowInput(!showInput)}
          title="Adicionar Marcador"
        >
          📍 Add Marker
        </button>
        {showInput && (
          <div className="marker-input-group">
            <input 
              type="text"
              value={markerName}
              onChange={(e) => setMarkerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddMarker()}
              placeholder="Nome do marcador..."
              autoFocus
            />
            <button onClick={handleAddMarker}>✓</button>
            <button onClick={() => {
              setShowInput(false);
              setMarkerName('');
            }}>✕</button>
          </div>
        )}
      </div>

      {markers && markers.length > 0 && (
        <div className="markers-list">
          {markers.map(marker => (
            <div 
              key={marker.id} 
              className="marker-item"
              onClick={() => onSeekToMarker(marker.time)}
            >
              <div 
                className="marker-color-indicator"
                style={{ backgroundColor: marker.color }}
              />
              <div className="marker-info">
                <span className="marker-name">{marker.name}</span>
                <span className="marker-time">{formatTime(marker.time)}</span>
              </div>
              <button 
                className="delete-marker-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMarker(marker.id);
                }}
                title="Remover Marcador"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Markers on timeline */}
      <div className="timeline-markers">
        {markers && markers.map(marker => (
          <div 
            key={marker.id}
            className="timeline-marker"
            style={{ 
              left: `${(marker.time / duration) * 100}%`,
              borderColor: marker.color
            }}
            onClick={() => onSeekToMarker(marker.time)}
            title={`${marker.name} - ${formatTime(marker.time)}`}
          >
            <div className="marker-flag" style={{ backgroundColor: marker.color }}>
              📍
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarkerSystem;



