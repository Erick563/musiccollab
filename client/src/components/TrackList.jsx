import React from 'react';
import './TrackList.css';

const TrackList = ({ tracks, currentTrack, onTrackSelect, onTrackDelete, onTrackUpdate }) => {
  const handleVolumeChange = (trackId, volume) => {
    onTrackUpdate(trackId, { volume: parseInt(volume) });
  };

  const handlePanChange = (trackId, pan) => {
    onTrackUpdate(trackId, { pan: parseInt(pan) });
  };

  const toggleMute = (trackId, currentMute) => {
    onTrackUpdate(trackId, { mute: !currentMute });
  };

  const toggleSolo = (trackId, currentSolo) => {
    onTrackUpdate(trackId, { solo: !currentSolo });
  };

  return (
    <div className="track-list">
      {tracks.map((track) => (
        <div 
          key={track.id}
          className={`track-item ${currentTrack?.id === track.id ? 'active' : ''} ${track.mute ? 'muted' : ''} ${track.solo ? 'solo' : ''}`}
        >
          {/* Track Header */}
          <div className="track-header" onClick={() => onTrackSelect(track)}>
            <div 
              className="track-color-bar" 
              style={{ backgroundColor: track.color }}
            />
            <div className="track-name">
              <span className="track-icon">🎵</span>
              <span className="track-title">{track.name}</span>
            </div>
            <div className="track-buttons">
              <button 
                className={`track-btn solo-btn ${track.solo ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSolo(track.id, track.solo);
                }}
                title="Solo"
              >
                S
              </button>
              <button 
                className={`track-btn mute-btn ${track.mute ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute(track.id, track.mute);
                }}
                title="Mute"
              >
                M
              </button>
            </div>
          </div>

          {/* Track Controls */}
          <div className="track-controls">
            {/* Volume */}
            <div className="track-control">
              <label>Volume</label>
              <div className="control-group">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={track.volume}
                  onChange={(e) => handleVolumeChange(track.id, e.target.value)}
                  className="volume-slider"
                />
                <span className="control-value">{track.volume}%</span>
              </div>
            </div>

            {/* Pan */}
            <div className="track-control">
              <label>Pan</label>
              <div className="control-group">
                <input 
                  type="range" 
                  min="-50" 
                  max="50" 
                  value={track.pan}
                  onChange={(e) => handlePanChange(track.id, e.target.value)}
                  className="pan-slider"
                />
                <span className="control-value">
                  {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(track.pan)}` : `R${track.pan}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="track-actions">
              <button 
                className="track-action-btn delete"
                onClick={() => onTrackDelete(track.id)}
                title="Remover Faixa"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Track Meter */}
          <div className="track-meter">
            <div className="meter-bar">
              <div 
                className="meter-level" 
                style={{ 
                  width: track.mute ? '0%' : `${track.volume}%`,
                  backgroundColor: track.color 
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrackList;

