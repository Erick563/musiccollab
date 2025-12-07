import React, { useRef, useEffect, useState } from 'react';
import WaveformDisplay from './WaveformDisplay';
import RegionSelector from './RegionSelector';
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
  onCopyRegion,
  isReadOnly = false
}) => {
  const audioRef = useRef(null);
  const trackRef = useRef(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [trackDuration, setTrackDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  
  // Web Audio API refs para PAN
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const pannerNodeRef = useRef(null);
  const isWebAudioInitialized = useRef(false);

  // Inicializar Web Audio API uma vez
  useEffect(() => {
    const initWebAudio = () => {
      const audio = audioRef.current;
      if (!audio || isWebAudioInitialized.current) return;

      try {
        // Criar AudioContext
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Criar source a partir do elemento audio
        const source = audioContext.createMediaElementSource(audio);
        sourceNodeRef.current = source;

        // Criar nós de processamento
        const gainNode = audioContext.createGain();
        const pannerNode = audioContext.createStereoPanner();

        gainNodeRef.current = gainNode;
        pannerNodeRef.current = pannerNode;

        // Conectar: source -> gain -> panner -> destination
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(audioContext.destination);

        isWebAudioInitialized.current = true;
        console.log('[TimelineTrack] Web Audio API inicializada para:', track.name);
      } catch (error) {
        console.error('[TimelineTrack] Erro ao inicializar Web Audio API:', error);
      }
    };

    const audio = audioRef.current;
    if (audio) {
      // Aguardar o áudio estar pronto antes de criar o contexto
      if (audio.readyState >= 1) {
        initWebAudio();
      } else {
        audio.addEventListener('loadedmetadata', initWebAudio, { once: true });
      }
    }

    return () => {
      // Cleanup: desconectar e fechar contexto
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {}
      }
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
        } catch (e) {}
      }
      if (pannerNodeRef.current) {
        try {
          pannerNodeRef.current.disconnect();
        } catch (e) {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
      isWebAudioInitialized.current = false;
    };
  }, [track.url, track.name]);

  useEffect(() => {
    if ((track.isSegment || track.deletedRegions?.length > 0) && track.duration) {
      setTrackDuration(track.duration);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setTrackDuration(audio.duration);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [track.url, track.isSegment, track.duration, track.deletedRegions]);

  const mapTimelineToAudio = (timelineTime, deletedRegions, trimStart) => {
    const sortedRegions = [...deletedRegions].sort((a, b) => a.start - b.start);
    
    let accumulatedTime = 0;
    let audioPosition = trimStart;
    
    for (const region of sortedRegions) {
      const distanceToRegion = region.start - audioPosition;
      
      if (accumulatedTime + distanceToRegion >= timelineTime) {
        const remaining = timelineTime - accumulatedTime;
        return audioPosition + remaining;
      }
      
      accumulatedTime += distanceToRegion;
      audioPosition = region.end;
    }
    
    const remaining = timelineTime - accumulatedTime;
    return audioPosition + remaining;
  };

  useEffect(() => {
    const audio = audioRef.current;
    const audioContext = audioContextRef.current;
    if (!audio) return;

    const trackStartTime = track.startTime || 0;
    const trackEndTime = trackStartTime + track.duration;
    const trimStart = track.trimStart || 0;
    const trimEnd = track.trimEnd || audio.duration;
    const deletedRegions = track.deletedRegions || [];

    const shouldPlay = hasSoloedTracks ? track.solo : !track.mute;

    if (isPlaying && shouldPlay) {
      const relativeTime = currentTime - trackStartTime;
      const actualAudioTime = mapTimelineToAudio(relativeTime, deletedRegions, trimStart);
      
      if (currentTime >= trackStartTime && currentTime < trackEndTime && actualAudioTime < trimEnd) {
        // Retomar AudioContext se estiver suspenso (política de autoplay)
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('[TimelineTrack] AudioContext retomado');
          });
        }
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, track.mute, track.solo, hasSoloedTracks, currentTime, track.duration, track.startTime, track.trimStart, track.trimEnd, track.deletedRegions, track.isSegment, track.name]);

  // Atualizar volume e pan usando Web Audio API
  useEffect(() => {
    const audio = audioRef.current;
    const gainNode = gainNodeRef.current;
    const pannerNode = pannerNodeRef.current;
    
    if (!audio) return;
    
    const shouldBeMuted = track.mute || (hasSoloedTracks && !track.solo);
    const targetVolume = shouldBeMuted ? 0 : (track.volume / 100);
    
    // Usar Web Audio API se disponível, senão usar volume nativo
    if (gainNode) {
      gainNode.gain.value = targetVolume;
    } else {
      audio.volume = targetVolume;
    }
    
    // Aplicar pan se disponível
    if (pannerNode && track.pan !== undefined) {
      // Normalizar pan de -50..50 para -1..1
      const normalizedPan = track.pan / 50;
      pannerNode.pan.value = Math.max(-1, Math.min(1, normalizedPan));
      console.log(`[TimelineTrack] Pan atualizado para ${track.name}: ${track.pan} (${normalizedPan.toFixed(2)})`);
    }
  }, [track.volume, track.pan, track.mute, track.solo, hasSoloedTracks, track.name]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !trackDuration) return;
    
    const trackStartTime = track.startTime || 0;
    const trackEndTime = trackStartTime + track.duration;
    const trimStart = track.trimStart || 0;
    const trimEnd = track.trimEnd || audio.duration;
    const deletedRegions = track.deletedRegions || [];
    
    const relativeTime = currentTime - trackStartTime;
    
    if (currentTime >= trackStartTime && currentTime < trackEndTime) {
      const actualAudioTime = mapTimelineToAudio(relativeTime, deletedRegions, trimStart);
      
      if (actualAudioTime <= trimEnd) {
        if (Math.abs(audio.currentTime - actualAudioTime) > 0.5) {
          audio.currentTime = Math.max(trimStart, Math.min(actualAudioTime, trimEnd));
        }
      } else {
        audio.pause();
        audio.currentTime = trimEnd;
      }
    } else if (currentTime >= trackEndTime) {
      audio.pause();
      audio.currentTime = trimEnd;
    } else {
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

  const handleRegionSelect = (region) => {
    setSelectedRegion(region);
    onUpdate(track.id, { selectedRegion: region });
  };

  const handleRegionSeek = (timeInTrack) => {
    const trackStartTime = track.startTime || 0;
    const absoluteTime = trackStartTime + timeInTrack;
    const absolutePercentage = absoluteTime / maxDuration;
    
    onSeek(absolutePercentage);
  };

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

  const isSilencedBySolo = hasSoloedTracks && !track.solo;

  return (
    <div 
      ref={trackRef}
      className={`timeline-track ${isSelected ? 'selected' : ''} ${track.mute ? 'muted' : ''} ${track.solo ? 'solo' : ''} ${isSilencedBySolo ? 'silenced-by-solo' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onSelect(track)}
    >
      <audio 
        ref={audioRef}
        src={track.url}
        preload="metadata"
      />

      <div className="track-main-row">
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
              if (!isReadOnly) toggleSolo();
            }}
            title={isReadOnly ? "Somente visualização" : "Solo"}
            disabled={isReadOnly}
          >
            S
          </button>
          <button 
            className={`track-btn mute-btn ${track.mute ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isReadOnly) toggleMute();
            }}
            title={isReadOnly ? "Somente visualização" : "Mute"}
            disabled={isReadOnly}
          >
            M
          </button>
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
            disabled={isReadOnly}
            title={isReadOnly ? "Somente visualização" : ""}
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
            disabled={isReadOnly}
            title={isReadOnly ? "Somente visualização" : ""}
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
            disabled={isReadOnly}
            title={isReadOnly ? "Somente visualização" : ""}
          />
          <span className="time-unit">s</span>
        </div>

        {!isReadOnly && (
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
        )}
        </div>

        <div className="track-waveform-row">
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

          <div 
            className="track-waveform-container"
            style={{ 
              width: maxDuration > 0 && trackDuration > 0 
                ? `${(trackDuration / maxDuration) * 100}%` 
                : '100%' 
            }}
          >
        <div 
          className="track-drag-handle" 
          title={isReadOnly ? "Somente visualização" : "Arraste para mover a faixa no tempo"}
          onMouseDown={isReadOnly ? undefined : handleDragHandleMouseDown}
          style={isReadOnly ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
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
        
        <RegionSelector 
          duration={trackDuration}
          onRegionSelect={handleRegionSelect}
          selectedRegion={selectedRegion}
          onSeek={handleRegionSeek}
          isReadOnly={isReadOnly}
        />
          </div>
        </div>
      </div>

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

