import React, { useRef, useEffect, useState } from 'react';
import WaveformDisplay from './WaveformDisplay';
import RegionSelector from './RegionSelector';
import EffectsPanel from './EffectsPanel';
import './TimelineTrack.css';

const TimelineTrack = ({ 
  track, 
  isSelected, 
  isPlaying,
  currentTime,
  duration,
  maxDuration,
  hasSoloedTracks,
  onSelect, 
  onUpdate,
  onDelete,
  onSeek,
  onCopyRegion
}) => {
  const audioRef = useRef(null);
  const trackRef = useRef(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [trackDuration, setTrackDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  // Get track duration - use track.duration if segments or has deleted regions
  useEffect(() => {
    // For segments or tracks with deleted regions, use the predefined duration from the track object
    if ((track.isSegment || track.deletedRegions?.length > 0) && track.duration) {
      console.log('📏 Usando duration do track:', track.duration);
      setTrackDuration(track.duration);
      return;
    }
    
    // For regular tracks without deletions, get duration from audio metadata
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setTrackDuration(audio.duration);
      console.log('📏 Track regular - duration do áudio:', audio.duration);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [track.url, track.isSegment, track.duration, track.deletedRegions]);

  // Helper function to map timeline time to actual audio time (skipping deleted regions)
  const mapTimelineToAudio = (timelineTime, deletedRegions, trimStart) => {
    // Timeline time is the "visual" time after deletions
    // We need to find the actual position in the original audio
    
    const sortedRegions = [...deletedRegions].sort((a, b) => a.start - b.start);
    
    let accumulatedTime = 0; // Time we've accumulated in the visual timeline
    let audioPosition = trimStart; // Position in the actual audio
    
    for (const region of sortedRegions) {
      // Distance from our current audio position to the start of this deleted region
      const distanceToRegion = region.start - audioPosition;
      
      if (accumulatedTime + distanceToRegion >= timelineTime) {
        // We're in the segment before this deleted region
        const remaining = timelineTime - accumulatedTime;
        return audioPosition + remaining;
      }
      
      // Move past this non-deleted segment
      accumulatedTime += distanceToRegion;
      audioPosition = region.end; // Jump over the deleted region
    }
    
    // We're after all deleted regions
    const remaining = timelineTime - accumulatedTime;
    return audioPosition + remaining;
  };

  // Sync audio playback (considering startTime offset, trimEnd for segments, Solo, and deleted regions)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const trackStartTime = track.startTime || 0;
    const trackEndTime = trackStartTime + track.duration;
    const trimStart = track.trimStart || 0;
    const trimEnd = track.trimEnd || audio.duration;
    const deletedRegions = track.deletedRegions || [];

    // Solo logic: 
    // - If ANY track is soloed, only play tracks that are soloed
    // - If NO tracks are soloed, play all tracks (except muted ones)
    const shouldPlay = hasSoloedTracks ? track.solo : !track.mute;

    if (isPlaying && shouldPlay) {
      // Calculate where we are relative to track start (in timeline/visual time)
      const relativeTime = currentTime - trackStartTime;
      
      // Map timeline time to actual audio time (skipping deleted regions)
      const actualAudioTime = mapTimelineToAudio(relativeTime, deletedRegions, trimStart);
      
      // Debug logs for tracks with deleted regions
      if (deletedRegions.length > 0 && Math.random() < 0.05) { // Log 5% of the time to avoid spam
        console.log('🎵 Playback mapping:', track.name);
        console.log('   Timeline time (visual):', relativeTime.toFixed(2), 's');
        console.log('   Audio time (actual):', actualAudioTime.toFixed(2), 's');
        console.log('   Deleted regions:', deletedRegions);
      }
      
      // Only play if current time is within track's time range and within trim range
      if (currentTime >= trackStartTime && currentTime < trackEndTime && actualAudioTime < trimEnd) {
        audio.play().catch(err => console.error('Playback error:', err));
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, track.mute, track.solo, hasSoloedTracks, currentTime, track.duration, track.startTime, track.trimStart, track.trimEnd, track.deletedRegions, track.isSegment, track.name]);

  // Sync audio volume (considering Solo)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // If there are soloed tracks and this track is NOT soloed, mute it
    const shouldBeMuted = track.mute || (hasSoloedTracks && !track.solo);
    
    audio.volume = shouldBeMuted ? 0 : (track.volume / 100);
  }, [track.volume, track.mute, track.solo, hasSoloedTracks]);

  // Sync audio time (considering startTime offset, trimStart/trimEnd for segments, and deleted regions)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !trackDuration) return;
    
    const trackStartTime = track.startTime || 0;
    const trackEndTime = trackStartTime + track.duration;
    const trimStart = track.trimStart || 0;
    const trimEnd = track.trimEnd || audio.duration;
    const deletedRegions = track.deletedRegions || [];
    
    // Calculate audio position relative to track start (timeline time)
    const relativeTime = currentTime - trackStartTime;
    
    if (currentTime >= trackStartTime && currentTime < trackEndTime) {
      // Map timeline time to actual audio time (skipping deleted regions)
      const actualAudioTime = mapTimelineToAudio(relativeTime, deletedRegions, trimStart);
      
      // Only sync if within track time range and respect trimEnd
      if (actualAudioTime <= trimEnd) {
        if (Math.abs(audio.currentTime - actualAudioTime) > 0.5) {
          audio.currentTime = Math.max(trimStart, Math.min(actualAudioTime, trimEnd));
        }
      } else {
        // Reached the end
        audio.pause();
        audio.currentTime = trimEnd;
      }
    } else if (currentTime >= trackEndTime) {
      // Pause if playhead passed the track end
      audio.pause();
      audio.currentTime = trimEnd;
    } else {
      // Before track starts
      audio.pause();
      audio.currentTime = trimStart;
    }
  }, [currentTime, track.duration, track.startTime, track.trimStart, track.trimEnd, track.deletedRegions, track.name, trackDuration]);

  const handleVolumeChange = (e) => {
    onUpdate(track.id, { volume: parseInt(e.target.value) });
  };

  const handlePanChange = (e) => {
    onUpdate(track.id, { pan: parseInt(e.target.value) });
  };

  const toggleMute = () => {
    onUpdate(track.id, { mute: !track.mute });
  };

  const toggleSolo = () => {
    onUpdate(track.id, { solo: !track.solo });
  };

  // Removido handleWaveformClick - deixar RegionSelector controlar os eventos de mouse

  const handleRegionSelect = (region) => {
    console.log('=== REGIÃO SELECIONADA ===');
    console.log('Track ID:', track.id);
    console.log('Track Name:', track.name);
    console.log('Region:', region);
    
    setSelectedRegion(region);
    // Update track with selected region so StudioPage can access it
    onUpdate(track.id, { selectedRegion: region });
  };

  // Handle seek from RegionSelector click
  const handleRegionSeek = (timeInTrack) => {
    const trackStartTime = track.startTime || 0;
    const absoluteTime = trackStartTime + timeInTrack;
    const absolutePercentage = absoluteTime / maxDuration;
    
    console.log('🎯 Seek do RegionSelector:');
    console.log('   timeInTrack:', timeInTrack);
    console.log('   trackStartTime:', trackStartTime);
    console.log('   absoluteTime:', absoluteTime);
    console.log('   absolutePercentage:', absolutePercentage);
    
    onSeek(absolutePercentage);
  };

  // handleCopyRegion removed - now only via Ctrl+C keyboard shortcut

  const handleUpdateEffects = (trackId, effects) => {
    onUpdate(trackId, { effects });
    console.log('Effects updated:', effects);
    // Aqui você implementaria a aplicação real dos efeitos usando Web Audio API
  };

  // Handle track position dragging - APENAS no drag handle
  const handleDragHandleMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartTime(track.startTime || 0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const timelineWidth = trackRef.current?.parentElement?.offsetWidth || 1;
    const deltaTime = (deltaX / timelineWidth) * maxDuration;
    
    const newStartTime = Math.max(0, dragStartTime + deltaTime);
    onUpdate(track.id, { startTime: newStartTime });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartX, dragStartTime]);

  const handleStartTimeChange = (e) => {
    const newStartTime = parseFloat(e.target.value);
    onUpdate(track.id, { startTime: newStartTime });
  };

  const trackStartTime = track.startTime || 0;

  // Check if track is silenced by solo
  const isSilencedBySolo = hasSoloedTracks && !track.solo;

  return (
    <div 
      ref={trackRef}
      className={`timeline-track ${isSelected ? 'selected' : ''} ${track.mute ? 'muted' : ''} ${track.solo ? 'solo' : ''} ${isSilencedBySolo ? 'silenced-by-solo' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onSelect(track)}
    >
      {/* Hidden audio element for playback */}
      <audio 
        ref={audioRef}
        src={track.url}
        preload="metadata"
      />

      {/* Main Row: Controls + Waveform */}
      <div className="track-main-row">
        {/* Track Controls */}
        <div className="track-controls-panel">
        <div className="track-header">
          <div 
            className="track-color-indicator" 
            style={{ backgroundColor: track.color }}
          />
          <div className="track-name-section">
            <span className="track-icon">{track.isSegment ? '✂️' : '🎵'}</span>
            <span className="track-title">{track.name}</span>
          </div>
          {track.isSegment && (
            <div className="segment-badge" title="Este é um segmento copiado">
              SEGMENTO
            </div>
          )}
        </div>

        <div className="track-buttons">
          <button 
            className={`track-btn solo-btn ${track.solo ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleSolo();
            }}
            title="Solo"
          >
            S
          </button>
          <button 
            className={`track-btn mute-btn ${track.mute ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            title="Mute"
          >
            M
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <EffectsPanel track={track} onUpdateEffects={handleUpdateEffects} />
          </div>
        </div>

        <div className="track-volume-control">
          <label>Vol</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={track.volume}
            onChange={handleVolumeChange}
            onClick={(e) => e.stopPropagation()}
            className="volume-slider-mini"
          />
          <span className="volume-value-mini">{track.volume}</span>
        </div>

        <div className="track-pan-control">
          <label>Pan</label>
          <input 
            type="range" 
            min="-50" 
            max="50" 
            value={track.pan}
            onChange={handlePanChange}
            onClick={(e) => e.stopPropagation()}
            className="pan-slider-mini"
          />
          <span className="pan-value-mini">
            {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(track.pan)}` : `R${track.pan}`}
          </span>
        </div>

        <div className="track-starttime-control">
          <label>Start</label>
          <input 
            type="number" 
            min="0" 
            max={maxDuration - trackDuration}
            step="0.1"
            value={trackStartTime.toFixed(1)}
            onChange={handleStartTimeChange}
            onClick={(e) => e.stopPropagation()}
            className="starttime-input"
          />
          <span className="time-unit">s</span>
        </div>

        <button 
          className="delete-track-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(track.id);
          }}
          title="Remover Faixa"
        >
          🗑️
        </button>
        </div>

        {/* Waveform Row */}
        <div className="track-waveform-row">
          {/* Empty space before track starts */}
          {trackStartTime > 0 && (
            <div 
              className="track-empty-space"
              style={{ 
                width: maxDuration > 0 
                  ? `${(trackStartTime / maxDuration) * 100}%` 
                  : '0%' 
              }}
            />
          )}

          {/* Waveform Display */}
          <div 
            className="track-waveform-container"
            style={{ 
              width: maxDuration > 0 && trackDuration > 0 
                ? `${(trackDuration / maxDuration) * 100}%` 
                : '100%' 
            }}
          >
        {/* Drag Handle */}
        <div 
          className="track-drag-handle" 
          title="Arraste para mover a faixa no tempo"
          onMouseDown={handleDragHandleMouseDown}
        >
          ⋮⋮
        </div>
        <WaveformDisplay 
          audioUrl={track.url}
          color={track.color}
          height={80}
          isPlaying={isPlaying && !track.mute && currentTime < trackDuration}
          trimStart={track.trimStart || 0}
          trimEnd={track.trimEnd || track.duration}
          deletedRegions={track.deletedRegions}
        />
        
        {/* Region Selector */}
        <RegionSelector 
          duration={trackDuration}
          onRegionSelect={handleRegionSelect}
          selectedRegion={selectedRegion}
          onSeek={handleRegionSeek}
        />
        
        {/* Playhead */}
        {maxDuration > 0 && trackDuration > 0 && currentTime >= trackStartTime && currentTime <= (trackStartTime + trackDuration) && (
          <div 
            className="track-playhead"
            style={{ left: `${((currentTime - trackStartTime) / trackDuration) * 100}%` }}
          />
        )}
          </div>
        </div>
      </div>

      {/* Duration Info Row */}
      {trackDuration > 0 && (
        <div className="track-duration-row">
          <div></div>
          <div className="track-duration-info">
            <span className="duration-label">
              Início: {Math.floor(trackStartTime / 60)}:{Math.floor(trackStartTime % 60).toString().padStart(2, '0')} | 
              Duração: {Math.floor(trackDuration / 60)}:{Math.floor(trackDuration % 60).toString().padStart(2, '0')} | 
              Fim: {Math.floor((trackStartTime + trackDuration) / 60)}:{Math.floor((trackStartTime + trackDuration) % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* Track Meter Row */}
      <div className="track-meter-row">
        <div className="track-level-meter">
          <div 
            className="meter-fill" 
            style={{ 
              width: track.mute ? '0%' : `${track.volume}%`,
              backgroundColor: track.color 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TimelineTrack;

