import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectService } from '../services/projectService';
import { trackService } from '../services/trackService';
import AudioUploader from '../components/AudioUploader';
import TimelineTrack from '../components/TimelineTrack';
import TimelineRuler from '../components/TimelineRuler';
import MarkerSystem from '../components/MarkerSystem';
import ExportModal from '../components/ExportModal';
import { ToastContainer } from '../components/Toast';
import './StudioPage.css';

const StudioPage = () => {
  const { user, logout } = useAuth();
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [projectName, setProjectName] = useState('Novo Projeto');
  const [currentProjectId, setCurrentProjectId] = useState(projectId || null);
  const [isLoading, setIsLoading] = useState(!!projectId);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleFileUpload = async (file) => {
    try {
      showToast('Carregando áudio...', 'info');
      
      // Criar URL temporária para obter duração e criar data URL
      const tempUrl = URL.createObjectURL(file);
      const audio = new Audio(tempUrl);
      
      audio.addEventListener('loadedmetadata', async () => {
        const trackDuration = audio.duration;
        
        try {
          // Criar data URL do arquivo para uso local
          const reader = new FileReader();
          reader.onloadend = () => {
            const audioUrl = reader.result; // Data URL
            
            const newTrack = {
              id: Date.now(), // ID temporário até salvar no banco
              trackId: null, // Será definido quando salvar no banco
              name: file.name.replace(/\.[^/.]+$/, ""),
              file: file, // Manter referência ao arquivo original
              url: audioUrl, // Data URL para reprodução
              duration: trackDuration,
              startTime: 0,
              volume: 75,
              pan: 0,
              solo: false,
              mute: false,
              color: getRandomColor(),
              isSegment: false,
              trimStart: null,
              trimEnd: null,
              deletedRegions: []
            };

            setTracks(prevTracks => {
              const updatedTracks = [...prevTracks, newTrack];
              
              // Update max duration
              const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
              setDuration(maxDur);
              
              return updatedTracks;
            });
            
            if (!selectedTrack) {
              setSelectedTrack(newTrack);
            }
            
            showToast('Áudio carregado com sucesso! Lembre-se de salvar o projeto.', 'success');
            
            // Limpar URL temporária
            URL.revokeObjectURL(tempUrl);
          };
          
          reader.onerror = () => {
            showToast('Erro ao processar arquivo de áudio', 'error');
            URL.revokeObjectURL(tempUrl);
          };
          
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          showToast('Erro ao processar arquivo de áudio', 'error');
          URL.revokeObjectURL(tempUrl);
        }
      });
      
      audio.addEventListener('error', () => {
        showToast('Erro ao carregar arquivo de áudio', 'error');
        URL.revokeObjectURL(tempUrl);
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      showToast('Erro ao processar arquivo de áudio', 'error');
    }
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

  // Carregar projeto existente
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const project = await projectService.getProject(projectId);
        
        setCurrentProjectId(project.id);
        setProjectName(project.title || 'Novo Projeto');
        
        // Carregar tracks do banco de dados
        const dbTracks = await trackService.getProjectTracks(project.id);
        
        // Carregar áudios e restaurar tracks
        const restoredTracks = await Promise.all(
          dbTracks.map(async (dbTrack) => {
            try {
              // Obter URL do áudio do servidor
              const audioUrl = await trackService.getTrackAudio(dbTrack.id);
              
              return {
                id: dbTrack.id,
                trackId: dbTrack.id,
                name: dbTrack.name,
                url: audioUrl,
                duration: dbTrack.duration || 0,
                startTime: 0, // Será restaurado do state se existir
                volume: 75,
                pan: 0,
                solo: false,
                mute: false,
                color: getRandomColor()
              };
            } catch (error) {
              console.error(`Erro ao carregar áudio da track ${dbTrack.id}:`, error);
              return null;
            }
          })
        );
        
        // Filtrar tracks que falharam ao carregar
        const validTracks = restoredTracks.filter(t => t !== null);
        
        // Restaurar estado do projeto (se existir)
        if (project.state) {
          const state = project.state;
          
          // Mesclar tracks do banco com estado salvo (para preservar posições, volumes, etc.)
          // Agora os segmentos são salvos como arquivos completos no banco, então não precisamos recriá-los
          if (state.tracks && state.tracks.length > 0) {
            const mergedTracks = validTracks.map(dbTrack => {
              // Procurar track correspondente no state
              const stateTrack = state.tracks.find(st => st.trackId === dbTrack.trackId || st.id === dbTrack.id);
              
              if (stateTrack) {
                // Mesclar dados do state com dados do banco
                return {
                  ...dbTrack,
                  startTime: stateTrack.startTime || 0,
                  volume: stateTrack.volume || 75,
                  pan: stateTrack.pan || 0,
                  solo: stateTrack.solo || false,
                  mute: stateTrack.mute || false,
                  color: stateTrack.color || dbTrack.color,
                  // Segmentos já foram processados e salvos como arquivos completos
                  trimStart: null,
                  trimEnd: null,
                  deletedRegions: [],
                  isSegment: false
                };
              }
              
              return dbTrack;
            });
            
            setTracks(mergedTracks);
          } else {
            setTracks(validTracks);
          }
          
          if (state.markers) {
            setMarkers(state.markers);
          }
          
          if (state.bpm !== undefined) {
            setBpm(state.bpm);
          }
          
          if (state.masterVolume !== undefined) {
            setMasterVolume(state.masterVolume);
          }
          
          if (state.zoom !== undefined) {
            setZoom(state.zoom);
          }
          
          if (state.currentTime !== undefined) {
            setCurrentTime(state.currentTime);
          }
        } else {
          // Se não houver state, usar apenas tracks do banco
          setTracks(validTracks);
        }
        
        showToast('Projeto carregado com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao carregar projeto:', error);
        
        // Se o projeto não foi encontrado ou usuário não tem acesso, redirecionar para dashboard
        if (error.response?.status === 404 || error.response?.status === 403) {
          showToast(
            error.response?.data?.message || 'Projeto não encontrado ou você não tem permissão para acessá-lo',
            'error'
          );
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          // Para outros erros, permitir criar novo projeto
          showToast('Erro ao carregar projeto. Você pode criar um novo projeto aqui.', 'warning');
          setCurrentProjectId(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Helper function to process audio segment (extract trimStart/trimEnd and remove deletedRegions)
  const processAudioSegment = async (track) => {
    try {
      // Fetch audio file
      const response = await fetch(track.url);
      const arrayBuffer = await response.arrayBuffer();
      
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;
      const deletedRegions = track.deletedRegions || [];
      
      // Se for segmento, aplicar trimStart/trimEnd primeiro
      let workingBuffer = audioBuffer;
      if (track.isSegment) {
        const trimStart = track.trimStart || 0;
        const trimEnd = track.trimEnd || audioBuffer.duration;
        
        // Calculate samples for trim
        const startSample = Math.floor(trimStart * sampleRate);
        const endSample = Math.floor(trimEnd * sampleRate);
        
        // Extract trimmed segment
        const segmentLength = endSample - startSample;
        const segmentBuffer = audioContext.createBuffer(numberOfChannels, segmentLength, sampleRate);
        
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sourceData = audioBuffer.getChannelData(channel);
          const destData = segmentBuffer.getChannelData(channel);
          
          // Copy trimmed segment
          for (let i = 0; i < segmentLength; i++) {
            const sourceIndex = startSample + i;
            if (sourceIndex < sourceData.length) {
              destData[i] = sourceData[sourceIndex];
            }
          }
        }
        
        workingBuffer = segmentBuffer;
      }
      
      // Remove deleted regions
      let finalBuffer = workingBuffer;
      if (deletedRegions.length > 0) {
        const bufferLength = workingBuffer.length;
        const bufferDuration = workingBuffer.duration;
        
        // Convert deleted regions to samples (considering trimStart if segment)
        const trimStart = track.isSegment ? (track.trimStart || 0) : 0;
        const relevantRegions = deletedRegions
          .filter(region => {
            // Filter regions that overlap with current buffer
            const regionStart = track.isSegment ? Math.max(trimStart, region.start) : region.start;
            const regionEnd = track.isSegment ? Math.min(trimStart + bufferDuration, region.end) : region.end;
            return regionEnd > trimStart && regionStart < trimStart + bufferDuration;
          })
          .map(region => ({
            start: Math.max(0, Math.floor((region.start - trimStart) * sampleRate)),
            end: Math.min(bufferLength, Math.floor((region.end - trimStart) * sampleRate))
          }))
          .sort((a, b) => a.start - b.start);
        
        if (relevantRegions.length > 0) {
          // Calculate total length after removing deleted regions
          let totalLength = bufferLength;
          for (const region of relevantRegions) {
            totalLength -= (region.end - region.start);
          }
          
          // Create new buffer without deleted regions
          const cleanedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);
          
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const sourceData = workingBuffer.getChannelData(channel);
            const destData = cleanedBuffer.getChannelData(channel);
            
            let destIndex = 0;
            let sourceIndex = 0;
            
            for (const region of relevantRegions) {
              // Copy part before deleted region
              const beforeLength = region.start - sourceIndex;
              for (let i = 0; i < beforeLength; i++) {
                destData[destIndex++] = sourceData[sourceIndex++];
              }
              // Skip deleted region
              sourceIndex = region.end;
            }
            
            // Copy remaining part
            while (sourceIndex < bufferLength && destIndex < totalLength) {
              destData[destIndex++] = sourceData[sourceIndex++];
            }
          }
          
          finalBuffer = cleanedBuffer;
        }
      }
      
      // Convert buffer to WAV blob
      const bufferToWav = (buffer) => {
        const length = buffer.length;
        const bytesPerSample = 2;
        const blockAlign = numberOfChannels * bytesPerSample;
        
        const wavBuffer = new ArrayBuffer(44 + length * blockAlign);
        const view = new DataView(wavBuffer);
        
        const writeString = (offset, string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * blockAlign, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);
        writeString(36, 'data');
        view.setUint32(40, length * blockAlign, true);
        
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
      
      const wavBlob = bufferToWav(finalBuffer);
      const fileName = `${track.name.replace(/[^a-z0-9]/gi, '_')}_segment.wav`;
      const file = new File([wavBlob], fileName, { type: 'audio/wav' });
      
      audioContext.close();
      
      return file;
    } catch (error) {
      console.error('Erro ao processar segmento:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!user) {
      showToast('Você precisa estar logado para salvar projetos', 'error');
      return;
    }

    if (tracks.length === 0) {
      showToast('Adicione pelo menos uma faixa antes de salvar', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      showToast('Salvando projeto e processando faixas...', 'info');

      // Criar ou atualizar projeto primeiro
      let projectId = currentProjectId;
      if (!projectId) {
        const projectData = {
          title: projectName.trim() || 'Novo Projeto',
          state: null // Será atualizado depois
        };
        const newProject = await projectService.createProject(projectData);
        projectId = newProject.id;
        setCurrentProjectId(projectId);
        window.history.pushState({}, '', `/studio/${projectId}`);
      }

      // Obter tracks existentes no banco para comparar
      const existingDbTracks = await trackService.getProjectTracks(projectId);
      const existingTrackIds = new Set(existingDbTracks.map(t => t.id));

      // Processar e criar/atualizar todas as tracks no banco
      const trackIdMap = new Map(); // Mapear IDs temporários para IDs do banco
      const processedTracks = [];
      const tracksToKeep = new Set(); // IDs de tracks que devem ser mantidas

      for (const track of tracks) {
        try {
          // Verificar se precisa processar o áudio (segmento ou tem regiões deletadas)
          const needsProcessing = track.isSegment || 
            (track.deletedRegions && track.deletedRegions.length > 0) ||
            (track.trimStart !== null && track.trimStart > 0) ||
            (track.trimEnd !== null);

          // Se a track já existe no banco e não precisa de processamento, apenas atualizar
          if (track.trackId && existingTrackIds.has(track.trackId) && !needsProcessing) {
            // Atualizar track existente
            await trackService.updateTrack(track.trackId, {
              name: track.name,
              duration: Math.floor(track.duration)
            });
            
            tracksToKeep.add(track.trackId);
            processedTracks.push({
              ...track,
              id: track.trackId,
              trackId: track.trackId
            });
            continue;
          }

          // Nova track ou track modificada - precisa processar e criar/recriar
          let audioFile = track.file;
          let trackName = track.name;
          
          // Se precisar processar, criar arquivo processado
          if (needsProcessing) {
            showToast(`Processando ${track.isSegment ? 'segmento' : 'faixa'}: ${track.name}...`, 'info');
            audioFile = await processAudioSegment(track);
            if (track.isSegment) {
              trackName = `${track.name}_segment`;
            }
          }

          if (!audioFile) {
            console.warn(`Track ${track.name} não tem arquivo de áudio, pulando...`);
            continue;
          }

          // Criar nova track no banco
          const trackData = {
            name: trackName,
            startTime: track.startTime || 0,
            volume: track.volume || 75,
            pan: track.pan || 0,
            color: track.color
          };

          const uploadedTrack = await trackService.createTrack(projectId, audioFile, trackData);
          
          // Atualizar duração se necessário
          if (track.duration) {
            await trackService.updateTrack(uploadedTrack.id, { duration: Math.floor(track.duration) });
          }

          // Se havia uma track antiga (segmento modificado), deletá-la
          if (track.trackId && existingTrackIds.has(track.trackId)) {
            try {
              await trackService.deleteTrack(track.trackId);
            } catch (error) {
              console.warn(`Erro ao deletar track antiga ${track.trackId}:`, error);
            }
          }

          tracksToKeep.add(uploadedTrack.id);
          trackIdMap.set(track.id, uploadedTrack.id);
          processedTracks.push({
            ...track,
            id: uploadedTrack.id,
            trackId: uploadedTrack.id
          });
        } catch (error) {
          console.error(`Erro ao processar track ${track.name}:`, error);
          showToast(`Erro ao processar ${track.name}. Continuando...`, 'warning');
        }
      }

      // Deletar tracks que não estão mais no projeto
      for (const dbTrack of existingDbTracks) {
        if (!tracksToKeep.has(dbTrack.id)) {
          try {
            await trackService.deleteTrack(dbTrack.id);
            console.log(`Track ${dbTrack.id} deletada (não está mais no projeto)`);
          } catch (error) {
            console.warn(`Erro ao deletar track ${dbTrack.id}:`, error);
          }
        }
      }

      // Preparar estado do projeto com IDs atualizados
      const projectState = {
        tracks: processedTracks.map(track => ({
          id: track.id,
          trackId: track.trackId || track.id,
          name: track.name,
          duration: track.duration,
          startTime: track.startTime || 0,
          volume: track.volume || 75,
          pan: track.pan || 0,
          solo: track.solo || false,
          mute: track.mute || false,
          color: track.color,
          trimStart: null, // Segmentos já foram processados
          trimEnd: null,
          deletedRegions: [],
          isSegment: false // Já foram processados como arquivos completos
        })),
        markers: markers,
        bpm: bpm,
        masterVolume: masterVolume,
        zoom: zoom,
        currentTime: currentTime
      };

      // Atualizar projeto com estado
      const projectData = {
        title: projectName.trim() || 'Novo Projeto',
        state: projectState
      };

      await projectService.updateProject(projectId, projectData);

      // Atualizar tracks locais com IDs do banco
      setTracks(processedTracks);

      showToast('Projeto salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      showToast(
        error.response?.data?.message || 'Erro ao salvar projeto. Tente novamente.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
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

  // Helper function to map timeline time to actual audio time (skipping deleted regions)
  const mapTimelineToAudioTime = useCallback((timelineTime, deletedRegions, trimStart) => {
    // Timeline time is the "visual" time after deletions
    // We need to find the actual position in the original audio
    
    if (!deletedRegions || deletedRegions.length === 0) {
      // No deletions, direct mapping
      return trimStart + timelineTime;
    }
    
    const sortedRegions = [...deletedRegions].sort((a, b) => a.start - b.start);
    
    let accumulatedTime = 0; // Time we've accumulated in the visual timeline
    let audioPosition = trimStart; // Position in the actual audio
    
    console.log(`🔄 Mapeando timeline ${timelineTime}s → áudio original`);
    console.log('   trimStart:', trimStart);
    console.log('   deletedRegions:', sortedRegions);
    
    for (const region of sortedRegions) {
      // Distance from our current audio position to the start of this deleted region
      const distanceToRegion = region.start - audioPosition;
      
      console.log(`   Região deletada: ${region.start}-${region.end}s`);
      console.log(`   Distância até região: ${distanceToRegion}s`);
      console.log(`   Tempo acumulado: ${accumulatedTime}s`);
      
      if (accumulatedTime + distanceToRegion >= timelineTime) {
        // We're in the segment before this deleted region
        const remaining = timelineTime - accumulatedTime;
        const result = audioPosition + remaining;
        console.log(`   ✅ Encontrado antes desta região: ${result}s`);
        return result;
      }
      
      // Move past this non-deleted segment
      accumulatedTime += distanceToRegion;
      audioPosition = region.end; // Jump over the deleted region
      console.log(`   ⏭️ Pulando região, novo acumulado: ${accumulatedTime}s, nova posição: ${audioPosition}s`);
    }
    
    // We're after all deleted regions
    const remaining = timelineTime - accumulatedTime;
    const result = audioPosition + remaining;
    console.log(`   ✅ Depois de todas as regiões: ${result}s`);
    return result;
  }, []);

  // Copy selected region from a track
  const handleCopyRegion = useCallback((trackId, region) => {
    console.log('=== COPIANDO REGIÃO ===');
    console.log('Track ID:', trackId);
    console.log('Region selecionada (visual):', region);

    const track = tracks.find(t => t.id === trackId);
    if (!track || !region) return;

    const trimStart = track.trimStart || 0;
    const deletedRegions = track.deletedRegions || [];

    console.log('📊 Estado da faixa:');
    console.log('   - Track name:', track.name);
    console.log('   - Track duration (visual):', track.duration);
    console.log('   - trimStart:', trimStart);
    console.log('   - deletedRegions:', deletedRegions);

    // Map timeline times to actual audio times (considering deleted regions)
    const adjustedRegion = {
      start: mapTimelineToAudioTime(region.start, deletedRegions, trimStart),
      end: mapTimelineToAudioTime(region.end, deletedRegions, trimStart)
    };

    console.log('🎯 Mapeamento:');
    console.log('   Region visual:', region.start, '-', region.end);
    console.log('   Region no áudio original:', adjustedRegion.start, '-', adjustedRegion.end);
    console.log('   Duração:', (adjustedRegion.end - adjustedRegion.start).toFixed(2), 's');

    setClipboard({
      trackId: track.trackId || track.id, // Save original trackId from database
      trackName: track.name,
      audioUrl: track.url,
      audioFile: track.file,
      region: adjustedRegion,
      color: track.color,
      originalDuration: track.duration,
      isCut: false
    });

    const duration = (region.end - region.start).toFixed(1);
    showToast(`Região copiada: ${track.name} (${duration}s)`, 'success');
    console.log('✅ Clipboard atualizado');
  }, [tracks, showToast, mapTimelineToAudioTime]);

  // Delete selected region from a track
  const handleDeleteRegion = useCallback((trackId, region) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || !region) return;

    console.log('🗑️ === DELETANDO REGIÃO ===');
    console.log('Track:', track.name);
    console.log('Region:', region);
    console.log('Track original duration:', track.duration);

    const regionDuration = region.end - region.start;
    const trimStart = track.trimStart || 0;
    const deletedRegions = track.deletedRegions || [];

    // Map timeline times to actual audio times (considering existing deleted regions)
    const absoluteRegion = {
      start: mapTimelineToAudioTime(region.start, deletedRegions, trimStart),
      end: mapTimelineToAudioTime(region.end, deletedRegions, trimStart)
    };

    console.log('Region relativa à timeline visual:', region);
    console.log('Region absoluta no áudio original:', absoluteRegion);

    // Add this region to the deletedRegions array and sort them
    const updatedDeletedRegions = [
      ...deletedRegions,
      absoluteRegion
    ].sort((a, b) => a.start - b.start); // Sort by start time

    // Calculate new duration (original duration minus this deleted region)
    const newDuration = track.duration - regionDuration;

    console.log('Duration anterior:', track.duration);
    console.log('Duração da região deletada:', regionDuration);
    console.log('Nova duration:', newDuration);

    // Update track with deleted region marked and reduced duration
    setTracks(prevTracks => {
      const updated = prevTracks.map(t => 
        t.id === trackId 
          ? { 
              ...t, 
              deletedRegions: updatedDeletedRegions,
              duration: newDuration
            }
          : t
      );
      
      // Update max duration
      if (updated.length > 0) {
        const maxDur = Math.max(...updated.map(t => (t.startTime || 0) + (t.duration || 0)));
        setDuration(maxDur);
      }
      
      return updated;
    });

    showToast(`${regionDuration.toFixed(1)}s removido de ${track.name}`, 'success');
    console.log('✅ Região deletada e faixa encurtada');
    console.log('Total de regiões deletadas:', updatedDeletedRegions.length);
  }, [tracks, showToast, mapTimelineToAudioTime]);

  // Cut selected region from a track (copy + delete)
  const handleCutRegion = useCallback((trackId, region) => {
    console.log('=== RECORTANDO REGIÃO ===');
    console.log('Track ID:', trackId);
    console.log('Region:', region);

    const track = tracks.find(t => t.id === trackId);
    if (!track || !region) return;

    const trimStart = track.trimStart || 0;
    const deletedRegions = track.deletedRegions || [];

    // Map timeline times to actual audio times (considering deleted regions)
    const adjustedRegion = {
      start: mapTimelineToAudioTime(region.start, deletedRegions, trimStart),
      end: mapTimelineToAudioTime(region.end, deletedRegions, trimStart)
    };

    console.log('Track trimStart:', trimStart);
    console.log('Deleted regions:', deletedRegions);
    console.log('Region original (relativa à timeline visual):', region);
    console.log('Region ajustada (relativa ao áudio original):', adjustedRegion);

    // First, copy to clipboard with "isCut" flag and adjusted region
    setClipboard({
      trackId: track.trackId || track.id, // Save original trackId from database
      trackName: track.name,
      audioUrl: track.url,
      audioFile: track.file,
      region: adjustedRegion,
      color: track.color,
      originalDuration: track.duration,
      isCut: true
    });

    // Then, delete the region from the track
    handleDeleteRegion(trackId, region);

    const duration = (region.end - region.start).toFixed(1);
    showToast(`Região recortada: ${track.name} (${duration}s)`, 'success');
    console.log('✅ Region cut to clipboard:', adjustedRegion);
  }, [tracks, showToast, handleDeleteRegion, mapTimelineToAudioTime]);

  // Paste clipboard content at current playhead position
  const handlePaste = useCallback(() => {
    if (!clipboard) {
      showToast('Nenhuma região copiada. Copie uma região primeiro.', 'warning');
      return;
    }

    // Find the original track to get its trackId (database ID)
    // Always find the original track from database, even if clipboard comes from a segment
    let originalTrack = tracks.find(t => t.id === clipboard.trackId || t.trackId === clipboard.trackId);
    
    // If the track found is a segment, find its original track
    if (originalTrack?.isSegment && originalTrack?.trackId) {
      const originalDbTrack = tracks.find(t => (t.id === originalTrack.trackId || t.trackId === originalTrack.trackId) && !t.isSegment);
      if (originalDbTrack) {
        originalTrack = originalDbTrack;
      }
    }
    
    const originalTrackId = originalTrack?.trackId || originalTrack?.id || clipboard.trackId;

    // Extract the audio segment and create a new track
    const segmentDuration = clipboard.region.end - clipboard.region.start;
    
    const newTrack = {
      id: Date.now(),
      trackId: originalTrackId, // Save reference to original track in database
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

      // Cut: Ctrl+X
      if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        
        // Use ref to get most recent value
        const currentTrack = selectedTrackRef.current || selectedTrack;
        
        // Also try to get directly from tracks array
        const trackFromArray = currentTrack ? tracks.find(t => t.id === currentTrack.id) : null;
        
        console.log('=== CTRL+X PRESSIONADO ===');
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
          console.log('✅ Recortando região:', trackToUse.selectedRegion);
          handleCutRegion(trackToUse.id, trackToUse.selectedRegion);
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
  }, [selectedTrack, clipboard, currentTime, isPlaying, handleCopyRegion, handleCutRegion, handleDeleteRegion, handlePaste, handlePlayPause, handleStop, handleSave, handleTrackDelete]);


  // Mostrar loading enquanto carrega projeto
  if (isLoading) {
    return (
      <div className="studio-page audacity-style">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ fontSize: '48px' }}>⏳</div>
          <div>Carregando projeto...</div>
        </div>
      </div>
    );
  }

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
          <button 
            className="header-btn" 
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? '⏳ Salvando...' : '💾 Salvar'}
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
                <kbd>Ctrl+X</kbd>
                <span>Recortar Região</span>
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
                  <li><strong>Ctrl+C</strong> para copiar região, <strong>Ctrl+X</strong> para recortar, <strong>Ctrl+V</strong> para colar</li>
                  <li><strong>Delete</strong> com região selecionada para remover áudio</li>
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
