import React, { useState } from 'react';
import './ExportModal.css';

const ExportModal = ({ isOpen, onClose, projectName, tracks, duration }) => {
  const [format, setFormat] = useState('mp3');
  const [quality, setQuality] = useState('high');
  const [normalizeAudio, setNormalizeAudio] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      console.log('🎵 Iniciando exportação...');
      console.log('Tracks:', tracks);
      console.log('Duration:', duration);

      // Step 1: Load all audio buffers
      setExportProgress(10);
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const buffers = await loadAllAudioBuffers(tracks, audioContext);
      console.log('✅ Buffers carregados:', buffers.length);
      
      setExportProgress(30);

      // Step 2: Create offline context for rendering
      const sampleRate = 44100;
      const numberOfChannels = 2; // Stereo
      const lengthInSamples = Math.ceil(duration * sampleRate);
      
      const offlineContext = new OfflineAudioContext(
        numberOfChannels,
        lengthInSamples,
        sampleRate
      );
      console.log('✅ OfflineContext criado:', lengthInSamples, 'samples');

      setExportProgress(40);

      // Step 3: Mix all tracks
      await mixTracks(tracks, buffers, offlineContext);
      console.log('✅ Tracks mixadas');

      setExportProgress(60);

      // Step 4: Render the mix
      const renderedBuffer = await offlineContext.startRendering();
      console.log('✅ Mix renderizada');

      setExportProgress(80);

      // Step 5: Normalize if requested
      let finalBuffer = renderedBuffer;
      if (normalizeAudio) {
        finalBuffer = normalizeBuffer(renderedBuffer);
        console.log('✅ Áudio normalizado');
      }

      setExportProgress(90);

      // Step 6: Convert to WAV and download
      const wavBlob = bufferToWav(finalBuffer);
      const filename = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
      downloadBlob(wavBlob, filename);
      console.log('✅ Download iniciado:', filename);

      setExportProgress(100);

      // Close contexts
      audioContext.close();

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        alert(`Projeto "${projectName}" exportado com sucesso! ✨`);
        onClose();
      }, 1000);

    } catch (error) {
      console.error('❌ Erro na exportação:', error);
      alert(`Erro ao exportar: ${error.message}`);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Load all audio buffers
  const loadAllAudioBuffers = async (tracks, audioContext) => {
    const promises = tracks.map(async (track) => {
      try {
        const response = await fetch(track.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return { track, buffer: audioBuffer };
      } catch (error) {
        console.error('Erro ao carregar track:', track.name, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
  };

  // Mix all tracks into offline context
  const mixTracks = async (tracks, buffers, offlineContext) => {
    // Check if any track is soloed
    const hasSoloedTracks = tracks.some(t => t.solo);

    buffers.forEach(({ track, buffer }) => {
      // Skip if muted OR (has soloed tracks AND this track is not soloed)
      const shouldSkip = track.mute || (hasSoloedTracks && !track.solo);
      if (shouldSkip) {
        console.log('⏭️ Skipping track:', track.name, '(muted or not soloed)');
        return;
      }

      console.log('🎚️ Mixing track:', track.name);

      // Create buffer source
      const source = offlineContext.createBufferSource();
      
      // For segments, we need to adjust the buffer
      if (track.isSegment && track.trimStart !== undefined && track.trimEnd !== undefined) {
        const sampleRate = buffer.sampleRate;
        const startSample = Math.floor(track.trimStart * sampleRate);
        const endSample = Math.floor(track.trimEnd * sampleRate);
        const duration = track.trimEnd - track.trimStart;
        const numberOfChannels = buffer.numberOfChannels;
        
        // Create trimmed buffer
        const trimmedBuffer = offlineContext.createBuffer(
          numberOfChannels,
          Math.ceil(duration * sampleRate),
          sampleRate
        );
        
        // Copy trimmed audio data
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sourceData = buffer.getChannelData(channel);
          const destData = trimmedBuffer.getChannelData(channel);
          for (let i = 0; i < destData.length; i++) {
            const sourceIndex = startSample + i;
            if (sourceIndex < sourceData.length) {
              destData[i] = sourceData[sourceIndex];
            }
          }
        }
        
        source.buffer = trimmedBuffer;
        console.log('   ✂️ Segmento trimmed:', track.trimStart, '-', track.trimEnd);
      } else {
        source.buffer = buffer;
      }

      // Create gain node for volume
      const gainNode = offlineContext.createGain();
      gainNode.gain.value = (track.volume || 75) / 100;

      // Create stereo panner for pan
      const pannerNode = offlineContext.createStereoPanner();
      pannerNode.pan.value = (track.pan || 0) / 50; // Convert -50/+50 to -1/+1

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(offlineContext.destination);

      // Start at the track's start time
      const startTime = track.startTime || 0;
      source.start(startTime);

      console.log('   Volume:', track.volume, 'Pan:', track.pan, 'StartTime:', startTime);
    });
  };

  // Normalize audio buffer
  const normalizeBuffer = (buffer) => {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    
    // Find peak amplitude
    let peak = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
    }

    // Create normalized buffer
    const normalizedBuffer = new AudioContext().createBuffer(
      numberOfChannels,
      length,
      sampleRate
    );

    // Normalize to -0.1dB to avoid clipping
    const normalizeRatio = peak > 0 ? 0.95 / peak : 1;
    
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel);
      const destData = normalizedBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        destData[i] = sourceData[i] * normalizeRatio;
      }
    }

    console.log('   Peak:', peak, 'Ratio:', normalizeRatio);
    return normalizedBuffer;
  };

  // Convert buffer to WAV blob
  const bufferToWav = (buffer) => {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numberOfChannels * bytesPerSample;

    const wavBuffer = new ArrayBuffer(44 + length * blockAlign);
    const view = new DataView(wavBuffer);

    // Write WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * blockAlign, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM format
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, length * blockAlign, true);

    // Write audio data
    const offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const int16 = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset + (i * blockAlign) + (channel * bytesPerSample), int16, true);
      }
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  // Download blob as file
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const qualityOptions = {
    mp3: [
      { value: 'low', label: '128 kbps' },
      { value: 'medium', label: '192 kbps' },
      { value: 'high', label: '320 kbps' }
    ],
    wav: [
      { value: 'medium', label: '16-bit' },
      { value: 'high', label: '24-bit' },
      { value: 'ultra', label: '32-bit' }
    ],
    ogg: [
      { value: 'low', label: 'Baixa (Q3)' },
      { value: 'medium', label: 'Média (Q6)' },
      { value: 'high', label: 'Alta (Q9)' }
    ]
  };

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>📤 Exportar Projeto</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="export-modal-content">
          {!isExporting ? (
            <>
              {/* Project Info */}
              <div className="export-info">
                <div className="info-row">
                  <span className="info-label">Projeto:</span>
                  <span className="info-value">{projectName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Faixas:</span>
                  <span className="info-value">{tracks.length}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Duração:</span>
                  <span className="info-value">
                    {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Format Selection */}
              <div className="export-section">
                <label className="section-label">Formato</label>
                <div className="format-options">
                  <button 
                    className={`format-btn ${format === 'mp3' ? 'active' : ''}`}
                    onClick={() => setFormat('mp3')}
                  >
                    <span className="format-icon">🎵</span>
                    <span>MP3</span>
                    <span className="format-desc">Mais compatível</span>
                  </button>
                  <button 
                    className={`format-btn ${format === 'wav' ? 'active' : ''}`}
                    onClick={() => setFormat('wav')}
                  >
                    <span className="format-icon">🎼</span>
                    <span>WAV</span>
                    <span className="format-desc">Sem perda</span>
                  </button>
                  <button 
                    className={`format-btn ${format === 'ogg' ? 'active' : ''}`}
                    onClick={() => setFormat('ogg')}
                  >
                    <span className="format-icon">🎧</span>
                    <span>OGG</span>
                    <span className="format-desc">Open source</span>
                  </button>
                </div>
              </div>

              {/* Quality Selection */}
              <div className="export-section">
                <label className="section-label">Qualidade</label>
                <div className="quality-options">
                  {qualityOptions[format].map(option => (
                    <button
                      key={option.value}
                      className={`quality-btn ${quality === option.value ? 'active' : ''}`}
                      onClick={() => setQuality(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="export-section">
                <label className="section-label">Opções</label>
                <div className="export-options">
                  <label className="option-checkbox">
                    <input 
                      type="checkbox"
                      checked={normalizeAudio}
                      onChange={(e) => setNormalizeAudio(e.target.checked)}
                    />
                    <span>Normalizar áudio</span>
                    <span className="option-desc">Ajusta o volume para evitar distorção</span>
                  </label>
                </div>
              </div>

              {/* File Preview */}
              <div className="export-preview">
                <div className="preview-label">Arquivo de saída:</div>
                <div className="preview-filename">
                  {projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.{format}
                </div>
                <div className="preview-size">
                  Tamanho estimado: ~{Math.round(duration * (format === 'wav' ? 1000 : 200) / 1024)}MB
                </div>
              </div>
            </>
          ) : (
            <div className="export-progress">
              <div className="progress-icon">⏳</div>
              <h3>Exportando projeto...</h3>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <div className="progress-text">{exportProgress}%</div>
              <p className="progress-desc">
                {exportProgress < 50 ? 'Mixando faixas...' : 
                 exportProgress < 80 ? 'Processando efeitos...' :
                 exportProgress < 100 ? 'Gerando arquivo...' : 'Concluído!'}
              </p>
            </div>
          )}
        </div>

        <div className="export-modal-footer">
          {!isExporting ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleExport}>
                📥 Exportar
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" disabled>
              Exportando...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;



