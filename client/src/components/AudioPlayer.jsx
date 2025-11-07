import React, { useRef, useEffect, useState } from 'react';
import './AudioPlayer.css';

const AudioPlayer = ({ track, isPlaying, onPlayPause, onStop, masterVolume }) => {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setCurrentTime(0);
      onStop();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [track, onStop]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const combinedVolume = (masterVolume / 100) * (track.volume / 100);
    audio.volume = combinedVolume;
  }, [masterVolume, track.volume]);

  useEffect(() => {
    setCurrentTime(0);
    setIsLoaded(false);
  }, [track.id]);

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player">
      <audio 
        ref={audioRef}
        src={track.url}
        preload="metadata"
      />

      <div className="player-header">
        <div className="track-info">
          <div 
            className="track-color-indicator" 
            style={{ backgroundColor: track.color }}
          />
          <div>
            <h3>{track.name}</h3>
            <p className="track-filename">{track.file.name}</p>
          </div>
        </div>
      </div>

      <div className="player-controls">
        <button 
          className="player-control-btn"
          onClick={onStop}
          title="Stop"
        >
          ⏹
        </button>
        <button 
          className={`player-control-btn play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={onPlayPause}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>

      <div className="player-timeline">
        <span className="time-display">{formatTime(currentTime)}</span>
        <div 
          className="progress-bar"
          onClick={handleSeek}
        >
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="progress-handle"
            style={{ left: `${progress}%` }}
          />
        </div>
        <span className="time-display">{formatTime(duration)}</span>
      </div>

      <div className="player-waveform">
        <div className="waveform-placeholder">
          {isLoaded ? '🎵 Forma de onda (em desenvolvimento)' : '⏳ Carregando...'}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;

