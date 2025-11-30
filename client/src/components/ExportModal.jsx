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
    // Validações antes de iniciar
    if (!tracks || tracks.length === 0) {
      alert('❌ Não há faixas para exportar. Adicione pelo menos uma faixa ao projeto.');
      return;
    }

    if (duration <= 0) {
      alert('❌ Duração do projeto inválida. Verifique as faixas.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      console.log('[Export] Iniciando exportação...', { tracks: tracks.length, duration });
      
      setExportProgress(10);
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const buffers = await loadAllAudioBuffers(tracks, audioContext);
      
      console.log('[Export] Buffers carregados:', buffers.length);
      setExportProgress(30);

      // Validar se conseguimos carregar pelo menos um buffer
      if (buffers.length === 0) {
        throw new Error('Nenhuma faixa de áudio pôde ser carregada. Verifique se os arquivos estão corretos.');
      }

      const sampleRate = 44100;
      const lengthInSamples = Math.ceil(duration * sampleRate);

      // Garantir pelo menos 2 canais (estéreo)
      const numberOfChannels = buffers.length > 0 
        ? Math.max(...buffers.map(({ buffer }) => buffer.numberOfChannels), 2)
        : 2;
      
      console.log('[Export] Criando contexto offline:', { numberOfChannels, lengthInSamples, sampleRate });
      
      const offlineContext = new OfflineAudioContext(
        numberOfChannels,
        lengthInSamples,
        sampleRate
      );

      setExportProgress(40);

      await mixTracks(tracks, buffers, offlineContext);

      console.log('[Export] Renderizando áudio...');
      setExportProgress(60);

      const renderedBuffer = await offlineContext.startRendering();

      console.log('[Export] Áudio renderizado:', { 
        length: renderedBuffer.length, 
        duration: renderedBuffer.duration,
        channels: renderedBuffer.numberOfChannels 
      });
      
      setExportProgress(80);

      let finalBuffer = renderedBuffer;
      if (normalizeAudio) {
        console.log('[Export] Normalizando áudio...');
        finalBuffer = normalizeBuffer(renderedBuffer);
      }

      setExportProgress(90);

      console.log('[Export] Convertendo para WAV...');
      const wavBlob = bufferToWav(finalBuffer);
      
      // Validar se o blob foi criado corretamente
      if (!wavBlob || wavBlob.size === 0) {
        throw new Error('Falha ao gerar arquivo de áudio. O arquivo está vazio.');
      }

      console.log('[Export] Arquivo gerado:', { size: wavBlob.size, type: wavBlob.type });

      const filename = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
      downloadBlob(wavBlob, filename);

      setExportProgress(100);

      audioContext.close();

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        alert(`✨ Projeto "${projectName}" exportado com sucesso!\n\nArquivo: ${filename}\nTamanho: ${(wavBlob.size / 1024 / 1024).toFixed(2)} MB`);
        onClose();
      }, 1000);

    } catch (error) {
      console.error('[Export] Erro na exportação:', error);
      alert(`❌ Erro ao exportar: ${error.message}\n\nVerifique:\n- Se todas as faixas têm áudio válido\n- Se há memória suficiente\n- O console do navegador para mais detalhes`);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const loadAllAudioBuffers = async (tracks, audioContext) => {
    const promises = tracks.map(async (track) => {
      try {
        console.log(`[Export] Carregando track: ${track.name}`, { 
          url: track.url ? 'presente' : 'ausente',
          duration: track.duration 
        });
        
        if (!track.url) {
          console.warn(`[Export] Track sem URL: ${track.name}`);
          return null;
        }

        const response = await fetch(track.url);
        
        if (!response.ok) {
          console.error(`[Export] Erro ao carregar track ${track.name}: HTTP ${response.status}`);
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
          console.error(`[Export] Track com dados vazios: ${track.name}`);
          return null;
        }

        console.log(`[Export] Decodificando track: ${track.name} (${arrayBuffer.byteLength} bytes)`);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        console.log(`[Export] Track carregada com sucesso: ${track.name}`, {
          duration: audioBuffer.duration,
          channels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate
        });
        
        return { track, buffer: audioBuffer };
      } catch (error) {
        console.error(`[Export] Falha ao carregar track "${track.name}":`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(r => r !== null);
    
    console.log(`[Export] Resumo do carregamento: ${validResults.length}/${tracks.length} tracks carregadas`);
    
    return validResults;
  };

  const mixTracks = async (tracks, buffers, offlineContext) => {
    const hasSoloedTracks = tracks.some(t => t.solo);
    console.log('[Export] Mixando tracks...', { 
      total: buffers.length, 
      hasSolo: hasSoloedTracks 
    });

    buffers.forEach(({ track, buffer }) => {
      const shouldSkip = track.mute || (hasSoloedTracks && !track.solo);
      if (shouldSkip) {
        console.log(`[Export] Pulando track: ${track.name} (mute=${track.mute}, solo=${track.solo})`);
        return;
      }
      
      console.log(`[Export] Processando track: ${track.name}`, {
        startTime: track.startTime,
        volume: track.volume,
        pan: track.pan,
        isSegment: track.isSegment,
        deletedRegions: track.deletedRegions?.length || 0
      });

      const source = offlineContext.createBufferSource();
      let processedBuffer = buffer;

      // Processar segmentos (trim) e regiões deletadas
      if (track.isSegment || (track.deletedRegions && track.deletedRegions.length > 0)) {
        const sampleRate = buffer.sampleRate;
        const numberOfChannels = buffer.numberOfChannels;
        
        // 1. Aplicar trim se for segmento
        let workingBuffer = buffer;
        if (track.isSegment && track.trimStart !== undefined && track.trimEnd !== undefined) {
          const startSample = Math.floor(track.trimStart * sampleRate);
          const endSample = Math.floor(track.trimEnd * sampleRate);
          const duration = track.trimEnd - track.trimStart;

          const trimmedBuffer = offlineContext.createBuffer(
            numberOfChannels,
            Math.ceil(duration * sampleRate),
            sampleRate
          );

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
          workingBuffer = trimmedBuffer;
        }

        // 2. Remover regiões deletadas
        if (track.deletedRegions && track.deletedRegions.length > 0) {
          const bufferLength = workingBuffer.length;
          const bufferDuration = workingBuffer.duration;
          const trimStart = track.isSegment ? (track.trimStart || 0) : 0;
          
          // Converter regiões deletadas para amostras
          const deletedRegions = track.deletedRegions
            .filter(region => {
              const regionStart = track.isSegment ? Math.max(trimStart, region.start) : region.start;
              const regionEnd = track.isSegment ? Math.min(trimStart + bufferDuration, region.end) : region.end;
              return regionEnd > trimStart && regionStart < trimStart + bufferDuration;
            })
            .map(region => ({
              start: Math.max(0, Math.floor((region.start - trimStart) * sampleRate)),
              end: Math.min(bufferLength, Math.floor((region.end - trimStart) * sampleRate))
            }))
            .sort((a, b) => a.start - b.start);

          if (deletedRegions.length > 0) {
            // Calcular tamanho do buffer final
            let totalLength = bufferLength;
            for (const region of deletedRegions) {
              totalLength -= (region.end - region.start);
            }

            const cleanedBuffer = offlineContext.createBuffer(numberOfChannels, totalLength, sampleRate);

            // Copiar dados excluindo regiões deletadas
            for (let channel = 0; channel < numberOfChannels; channel++) {
              const sourceData = workingBuffer.getChannelData(channel);
              const destData = cleanedBuffer.getChannelData(channel);

              let destIndex = 0;
              let sourceIndex = 0;

              for (const region of deletedRegions) {
                // Copiar dados antes da região deletada
                const beforeLength = region.start - sourceIndex;
                for (let i = 0; i < beforeLength; i++) {
                  destData[destIndex++] = sourceData[sourceIndex++];
                }
                // Pular região deletada
                sourceIndex = region.end;
              }

              // Copiar dados restantes após última região deletada
              while (sourceIndex < bufferLength && destIndex < totalLength) {
                destData[destIndex++] = sourceData[sourceIndex++];
              }
            }

            workingBuffer = cleanedBuffer;
          }
        }

        processedBuffer = workingBuffer;
      }

      source.buffer = processedBuffer;

      const gainNode = offlineContext.createGain();
      gainNode.gain.value = (track.volume || 75) / 100;

      // Aplicar pan apenas se houver mais de um canal
      if (offlineContext.destination.channelCount > 1 && track.pan !== undefined && track.pan !== 0) {
        const pannerNode = offlineContext.createStereoPanner();
        pannerNode.pan.value = track.pan / 50; // Normalizar de -50..50 para -1..1
        
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(offlineContext.destination);
      } else {
        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);
      }

      const startTime = track.startTime || 0;
      source.start(startTime);
    });
  };

  const normalizeBuffer = (buffer) => {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    let peak = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
    }

    const normalizedBuffer = new AudioContext().createBuffer(
      numberOfChannels,
      length,
      sampleRate
    );

    const normalizeRatio = peak > 0 ? 0.95 / peak : 1;

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel);
      const destData = normalizedBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        destData[i] = sourceData[i] * normalizeRatio;
      }
    }


    return normalizedBuffer;
  };

  const bufferToWav = (buffer) => {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    // Determinar bits por amostra baseado na qualidade
    // Para simplicidade e compatibilidade, usar sempre 16-bit
    // Se precisar de maior qualidade, usar 24-bit ou 32-bit float
    let bitsPerSample = 16;
    let isFloat = false;
    
    if (format === 'wav') {
      if (quality === 'ultra') {
        bitsPerSample = 32;
        isFloat = true; // 32-bit float
      } else if (quality === 'high') {
        bitsPerSample = 24;
      }
    }

    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    
    // Header WAV: 44 bytes para PCM, 46 bytes para float
    const headerSize = isFloat ? 46 : 44;
    const dataSize = length * blockAlign;
    const wavBuffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(wavBuffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF chunk
    writeString(0, 'RIFF');
    view.setUint32(4, headerSize - 8 + dataSize, true); // Tamanho total - 8
    writeString(8, 'WAVE');
    
    // fmt chunk
    writeString(12, 'fmt ');
    view.setUint32(16, isFloat ? 18 : 16, true); // Tamanho do fmt chunk
    view.setUint16(20, isFloat ? 3 : 1, true); // Formato: 1=PCM, 3=IEEE float
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // Byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // Para float, adicionar extensão
    let dataOffset = 36;
    if (isFloat) {
      view.setUint16(36, 0, true); // cbSize = 0 (sem extensão)
      writeString(38, 'data');
      view.setUint32(42, dataSize, true);
      dataOffset = 46;
    } else {
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);
      dataOffset = 44;
    }

    // Escrever dados de áudio
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        const offset = dataOffset + (i * blockAlign) + (channel * bytesPerSample);
        
        if (isFloat) {
          // 32-bit float
          view.setFloat32(offset, sample, true);
        } else if (bitsPerSample === 24) {
          // 24-bit PCM
          const int24 = Math.round(sample * 0x7FFFFF);
          view.setUint8(offset, int24 & 0xFF);
          view.setUint8(offset + 1, (int24 >> 8) & 0xFF);
          view.setUint8(offset + 2, (int24 >> 16) & 0xFF);
        } else {
          // 16-bit PCM
          const int16 = Math.round(sample * 0x7FFF);
          view.setInt16(offset, int16, true);
        }
      }
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

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



