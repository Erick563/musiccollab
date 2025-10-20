import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AudioUploader from '../components/AudioUploader';
import TimelineTrack from '../components/TimelineTrack';
import TimelineRuler from '../components/TimelineRuler';
import MarkerSystem from '../components/MarkerSystem';
import ExportModal from '../components/ExportModal';
import { ToastContainer } from '../components/Toast';
import './StudioPage.css';

const StudioPage = () => {
  const { user, logout } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [projectName, setProjectName] = useState('Novo Projeto');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(75);
  const [bpm, setBpm] = useState(120);
  const [zoom, setZoom] = useState(1);
  const [markers, setMarkers] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [toasts, setToasts] = useState([]);
  const playbackIntervalRef = useRef(null);
  const selectedTrackRef = useRef(null);

  // Calculate max duration from all tracks (considering start time + duration)
  useEffect(() => {
    if (tracks.length === 0) {
      setDuration(0);
      return;
    }

    // Get duration from the longest track (startTime + duration)
    const maxDur = Math.max(...tracks.map(t => (t.startTime || 0) + (t.duration || 0)));
    if (maxDur > 0) {
      setDuration(maxDur);
    }
  }, [tracks]);

  // Sync selectedTrack with tracks array when tracks update
  useEffect(() => {
    if (selectedTrack) {
      selectedTrackRef.current = selectedTrack;
    }
  }, [selectedTrack]);

  // Update selectedTrack when tracks change
  useEffect(() => {
    if (selectedTrack) {
      const updatedSelectedTrack = tracks.find(t => t.id === selectedTrack.id);
      if (updatedSelectedTrack) {
        console.log('🔄 Sincronizando selectedTrack com tracks');
        console.log('Track atual:', selectedTrack);
        console.log('Track atualizado do array:', updatedSelectedTrack);
        console.log('Tem região no array?', !!updatedSelectedTrack.selectedRegion);
        
        // Always update to get latest data from tracks array
        setSelectedTrack(updatedSelectedTrack);
        selectedTrackRef.current = updatedSelectedTrack;
      }
    }
  }, [tracks]);

  // Handle playback timing
  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          
          // Normal playback end
          if (newTime >= duration) {
            setIsPlaying(false);
            return 0;
          }
          
          return newTime;
        });
      }, 100);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, duration]);

  const handleFileUpload = (file) => {
    const url = URL.createObjectURL(file);
    
    // Create audio element to get duration
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      const trackDuration = audio.duration;
      
      const newTrack = {
        id: Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        file: file,
        url: url,
        duration: trackDuration,
        startTime: 0, // Offset na timeline (quando a faixa começa)
        volume: 75,
        pan: 0,
        solo: false,
        mute: false,
        color: getRandomColor()
      };

      setTracks(prevTracks => {
        const updatedTracks = [...prevTracks, newTrack];
        
        // Update max duration (considera duração da faixa + seu offset)
        const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
        setDuration(maxDur);
        
        return updatedTracks;
      });
      
      if (!selectedTrack) {
        setSelectedTrack(newTrack);
      }
    });
  };

  const getRandomColor = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
  };

  const handleTrackDelete = (trackId) => {
    const updatedTracks = tracks.filter(t => t.id !== trackId);
    setTracks(updatedTracks);
    
    if (selectedTrack?.id === trackId) {
      setSelectedTrack(updatedTracks[0] || null);
    }
    
    // Recalculate max duration
    if (updatedTracks.length > 0) {
      const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
      setDuration(maxDur);
    } else {
      setDuration(0);
    }
  };

  const handleTrackUpdate = (trackId, updates) => {
    console.log('=== ATUALIZANDO TRACK ===');
    console.log('Track ID:', trackId);
    console.log('Updates:', updates);
    
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === trackId ? { ...track, ...updates } : track
      )
    );
    
    // O useEffect abaixo irá sincronizar o selectedTrack automaticamente
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (percentage) => {
    const newTime = percentage * duration;
    setCurrentTime(newTime);
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleSave = () => {
    alert(`Projeto "${projectName}" salvo com sucesso!`);
  };

  const handleAddMarker = (marker) => {
    setMarkers([...markers, marker]);
  };

  const handleDeleteMarker = (markerId) => {
    setMarkers(markers.filter(m => m.id !== markerId));
  };

  const handleSeekToMarker = (time) => {
    setCurrentTime(time);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  // Add toast notification
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Copy selected region from a track
  const handleCopyRegion = useCallback((trackId, region) => {
    console.log('=== COPIANDO REGIÃO ===');
    console.log('Track ID:', trackId);
    console.log('Region:', region);

    const track = tracks.find(t => t.id === trackId);
    if (!track || !region) return;

    setClipboard({
      trackId: track.id,
      trackName: track.name,
      audioUrl: track.url,
      audioFile: track.file,
      region: region,
      color: track.color,
      originalDuration: track.duration
    });

    const duration = (region.end - region.start).toFixed(1);
    showToast(`Região copiada: ${track.name} (${duration}s)`, 'success');
    console.log('✅ Region copied to clipboard:', region);
  }, [tracks, showToast]);

  // Delete selected region from a track
  const handleDeleteRegion = useCallback((trackId, region) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || !region) return;

    console.log('🗑️ === DELETANDO REGIÃO ===');
    console.log('Track:', track.name);
    console.log('Region:', region);
    console.log('Track original duration:', track.duration);
    console.log('Track trimStart:', track.trimStart, 'trimEnd:', track.trimEnd);

    const newTracks = [];
    const regionDuration = region.end - region.start;
    const trackStartTime = track.startTime || 0;
    const originalTrimStart = track.trimStart || 0;
    const originalDuration = track.isSegment ? (track.trimEnd - track.trimStart) : track.duration;

    // Create segment BEFORE the deleted region (if it exists)
    if (region.start > 0.1) {
      const beforeSegment = {
        id: Date.now(),
        name: `${track.name} (Parte 1)`,
        file: track.file,
        url: track.url,
        duration: region.start,
        startTime: trackStartTime,
        trimStart: originalTrimStart,
        trimEnd: originalTrimStart + region.start,
        volume: track.volume,
        pan: track.pan,
        solo: track.solo,
        mute: track.mute,
        color: track.color,
        isSegment: true
      };
      newTracks.push(beforeSegment);
      console.log('✅ Criando segmento ANTES da região deletada:', beforeSegment);
    }

    // Create segment AFTER the deleted region (if it exists)
    const afterDuration = originalDuration - region.end;
    
    if (afterDuration > 0.1) {
      const afterSegment = {
        id: Date.now() + 1,
        name: `${track.name} (Parte 2)`,
        file: track.file,
        url: track.url,
        duration: afterDuration,
        startTime: trackStartTime + region.start, // Starts immediately after part 1
        trimStart: originalTrimStart + region.end,
        trimEnd: originalTrimStart + originalDuration,
        volume: track.volume,
        pan: track.pan,
        solo: track.solo,
        mute: track.mute,
        color: track.color,
        isSegment: true
      };
      newTracks.push(afterSegment);
      console.log('✅ Criando segmento DEPOIS da região deletada:', afterSegment);
    }

    // Remove original track and add new segments
    setTracks(prevTracks => {
      const filtered = prevTracks.filter(t => t.id !== trackId);
      const updated = [...filtered, ...newTracks];
      
      // Update max duration
      if (updated.length > 0) {
        const maxDur = Math.max(...updated.map(t => (t.startTime || 0) + (t.duration || 0)));
        setDuration(maxDur);
      } else {
        setDuration(0);
      }
      
      return updated;
    });

    // Clear selected track
    setSelectedTrack(null);

    showToast(`${regionDuration.toFixed(1)}s removido de ${track.name}`, 'success');
    console.log('✅ Região deletada com sucesso - criadas', newTracks.length, 'partes');
  }, [tracks, showToast]);

  // Paste clipboard content at current playhead position
  const handlePaste = useCallback(() => {
    if (!clipboard) {
      showToast('Nenhuma região copiada. Copie uma região primeiro.', 'warning');
      return;
    }

    // Extract the audio segment and create a new track
    const segmentDuration = clipboard.region.end - clipboard.region.start;
    
    const newTrack = {
      id: Date.now(),
      name: `${clipboard.trackName} (Segmento)`,
      file: clipboard.audioFile,
      url: clipboard.audioUrl,
      duration: segmentDuration, // Duration of the segment ONLY
      startTime: currentTime, // Paste at current playhead position
      trimStart: clipboard.region.start, // Start of segment in original audio
      trimEnd: clipboard.region.end, // End of segment in original audio
      volume: 75,
      pan: 0,
      solo: false,
      mute: false,
      color: clipboard.color,
      isSegment: true // Flag to indicate this is a segment
    };

    console.log('📋 === COLANDO SEGMENTO ===');
    console.log('Clipboard:', clipboard);
    console.log('Região copiada:', clipboard.region);
    console.log('Novo track criado:', newTrack);
    console.log('   - duration (do segmento):', segmentDuration);
    console.log('   - startTime (na timeline):', currentTime);
    console.log('   - trimStart (no áudio original):', clipboard.region.start);
    console.log('   - trimEnd (no áudio original):', clipboard.region.end);
    console.log('   - isSegment:', true);

    setTracks(prevTracks => {
      const updatedTracks = [...prevTracks, newTrack];
      
      // Update max duration
      const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
      setDuration(maxDur);
      
      return updatedTracks;
    });

    const timeStr = `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`;
    showToast(`Segmento colado em ${timeStr}`, 'success');
    console.log('✅ Pasted segment at', currentTime);
  }, [clipboard, currentTime, showToast]);

  // Clear clipboard - removed ClipboardIndicator component

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Copy: Ctrl+C
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        
        // Use ref to get most recent value
        const currentTrack = selectedTrackRef.current || selectedTrack;
        
        // Also try to get directly from tracks array
        const trackFromArray = currentTrack ? tracks.find(t => t.id === currentTrack.id) : null;
        
        console.log('=== CTRL+C PRESSIONADO ===');
        console.log('Selected Track (state):', selectedTrack);
        console.log('Selected Track (ref):', selectedTrackRef.current);
        console.log('Track from array:', trackFromArray);
        console.log('Selected Track ID:', currentTrack?.id);
        console.log('Has Region (state)?:', !!selectedTrack?.selectedRegion);
        console.log('Has Region (ref)?:', !!selectedTrackRef.current?.selectedRegion);
        console.log('Has Region (array)?:', !!trackFromArray?.selectedRegion);
        console.log('Region (array):', trackFromArray?.selectedRegion);
        
        // Try to use track from array first (most recent)
        const trackToUse = trackFromArray || currentTrack;
        
        if (trackToUse && trackToUse.selectedRegion) {
          console.log('✅ Copiando região:', trackToUse.selectedRegion);
          handleCopyRegion(trackToUse.id, trackToUse.selectedRegion);
        } else {
          showToast('Selecione uma região na forma de onda primeiro', 'warning');
          console.warn('❌ Nenhuma região selecionada.');
          console.log('Dica: Clique e ARRASTE sobre a forma de onda para criar uma região azul');
        }
      }

      // Paste: Ctrl+V
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }

      // Play/Pause: Space
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      }

      // Stop: S
      if (e.key === 's' && !e.ctrlKey) {
        e.preventDefault();
        handleStop();
      }

      // Save: Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Delete: Delete key
      if (e.key === 'Delete' && selectedTrack) {
        e.preventDefault();
        
        // If there's a selected region, delete the region
        if (selectedTrack.selectedRegion) {
          console.log('🗑️ Delete com região selecionada');
          handleDeleteRegion(selectedTrack.id, selectedTrack.selectedRegion);
        } else {
          // If no region selected, delete the entire track
          console.log('🗑️ Delete sem região - deletando faixa inteira');
          handleTrackDelete(selectedTrack.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTrack, clipboard, currentTime, isPlaying, handleCopyRegion, handleDeleteRegion, handlePaste, handlePlayPause, handleStop, handleSave, handleTrackDelete]);


  return (
    <div className="studio-page audacity-style">
      {/* Header */}
      <header className="studio-header">
        <div className="header-left">
          <div className="logo">🎵 MusicCollab Studio</div>
          <input 
            type="text" 
            className="project-name-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Nome do Projeto"
          />
        </div>
        <div className="header-center">
          <div className="bpm-control">
            <label>BPM</label>
            <input 
              type="number" 
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              min="60"
              max="200"
            />
          </div>
          <div className="time-display">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="time-separator">/</span>
            <span className="total-time">{formatTime(duration)}</span>
          </div>
        </div>
        <div className="header-right">
          <button className="header-btn" onClick={handleSave}>
            💾 Salvar
          </button>
          <button className="header-btn" onClick={handleExport}>
            📤 Exportar
          </button>
          <div className="user-info">
            <span>{user?.name}</span>
            <button className="logout-btn" onClick={logout}>Sair</button>
          </div>
        </div>
      </header>

      {/* Transport Bar */}
      <div className="transport-bar">
        <div className="transport-controls">
          <button 
            className="transport-btn stop"
            onClick={handleStop}
            title="Stop"
          >
            ⏹
          </button>
          <button 
            className={`transport-btn play ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button 
            className="transport-btn record"
            title="Record"
          >
            ⏺
          </button>
        </div>

        <div className="transport-info">
          <div className="track-count">
            <span className="info-label">Faixas:</span>
            <span className="info-value">{tracks.length}</span>
          </div>
        </div>

        <div className="zoom-controls">
          <button onClick={handleZoomOut} title="Zoom Out">🔍-</button>
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} title="Zoom In">🔍+</button>
        </div>

        <div className="master-controls">
          <label>Master Volume</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={masterVolume}
            onChange={(e) => setMasterVolume(e.target.value)}
            className="master-volume-slider"
          />
          <span className="volume-value">{masterVolume}%</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="studio-content audacity-layout">
        {/* Sidebar */}
        <aside className="studio-sidebar">
          <div className="sidebar-section">
            <h3>Upload de Áudio</h3>
            <AudioUploader onFileUpload={handleFileUpload} />
          </div>

          <div className="sidebar-section">
            <h3>Informações</h3>
            <div className="info-item">
              <span>Faixas:</span>
              <strong>{tracks.length}</strong>
            </div>
            <div className="info-item">
              <span>BPM:</span>
              <strong>{bpm}</strong>
            </div>
            <div className="info-item">
              <span>Duração:</span>
              <strong>{formatTime(duration)}</strong>
            </div>
            <div className="info-item">
              <span>Status:</span>
              <strong>{isPlaying ? '▶ Tocando' : '⏸ Pausado'}</strong>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Marcadores</h3>
            <MarkerSystem 
              duration={duration}
              currentTime={currentTime}
              markers={markers}
              onAddMarker={handleAddMarker}
              onDeleteMarker={handleDeleteMarker}
              onSeekToMarker={handleSeekToMarker}
            />
          </div>

          <div className="sidebar-section">
            <h3>Atalhos</h3>
            <div className="shortcuts">
              <div className="shortcut-item">
                <kbd>Space</kbd>
                <span>Play/Pause</span>
              </div>
              <div className="shortcut-item">
                <kbd>S</kbd>
                <span>Stop</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl+C</kbd>
                <span>Copiar Região</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl+V</kbd>
                <span>Colar Segmento</span>
              </div>
              <div className="shortcut-item">
                <kbd>Shift+Click</kbd>
                <span>Limpar Região</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl+S</kbd>
                <span>Salvar</span>
              </div>
              <div className="shortcut-item">
                <kbd>Del</kbd>
                <span>Deletar Região/Faixa</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Timeline Area */}
        <main className="timeline-area" style={{ transform: `scaleX(${zoom})`, transformOrigin: 'left' }}>
          {tracks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎵</div>
              <h2>Comece seu projeto</h2>
              <p>Faça upload de suas faixas de áudio para começar</p>
              <div className="empty-tips">
                <h4>Dicas:</h4>
                <ul>
                  <li>Arraste arquivos de áudio para a área de upload</li>
                  <li>Formatos suportados: MP3, WAV, OGG, M4A</li>
                  <li>Todas as faixas são reproduzidas simultaneamente</li>
                  <li><strong>Clique</strong> na forma de onda para mover o cursor</li>
                  <li><strong>Arraste</strong> na forma de onda para selecionar região</li>
                  <li><strong>Delete</strong> com região selecionada para cortar áudio</li>
                  <li>Use Solo (S) e Mute (M) para isolar faixas</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <TimelineRuler duration={duration} />
              <div className="timeline-tracks">
                {tracks.map(track => {
                  // Check if any track is soloed
                  const hasSoloedTracks = tracks.some(t => t.solo);
                  
                  return (
                    <TimelineTrack
                      key={track.id}
                      track={track}
                      isSelected={selectedTrack?.id === track.id}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      duration={duration}
                      maxDuration={duration}
                      hasSoloedTracks={hasSoloedTracks}
                      onSelect={handleTrackSelect}
                      onUpdate={handleTrackUpdate}
                      onDelete={handleTrackDelete}
                      onSeek={handleSeek}
                      onCopyRegion={handleCopyRegion}
                      onDeleteRegion={handleDeleteRegion}
                    />
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectName={projectName}
        tracks={tracks}
        duration={duration}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default StudioPage;
