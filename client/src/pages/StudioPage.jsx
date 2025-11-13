import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCollaboration } from '../contexts/CollaborationContext';
import { projectService } from '../services/projectService';
import { trackService } from '../services/trackService';
import AudioUploader from '../components/AudioUploader';
import TimelineTrack from '../components/TimelineTrack';
import TimelineRuler from '../components/TimelineRuler';
import ExportModal from '../components/ExportModal';
import CollaboratorsPanel from '../components/CollaboratorsPanel';
import OnlineUsers from '../components/OnlineUsers';
import UserCursors from '../components/UserCursors';
import CollaborativeCursor from '../components/CollaborativeCursor';
import { ToastContainer } from '../components/Toast';
import './StudioPage.css';

const StudioPage = () => {
  const { user, logout } = useAuth();
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const {
    isConnected,
    onlineUsers,
    lockedTracks,
    joinProject,
    leaveProject,
    updateCursor,
    updateMousePosition,
    requestLock,
    releaseLock,
    isTrackLocked,
    getTrackLocker,
    notifyTrackAdded,
    notifyTrackUpdated,
    notifyTrackDeleted,
    on,
    off
  } = useCollaboration();
  
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
  const [zoom, setZoom] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCollaboratorsPanel, setShowCollaboratorsPanel] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [projectOwner, setProjectOwner] = useState(null);
  const [editingTrackId, setEditingTrackId] = useState(null);
  const playbackIntervalRef = useRef(null);
  const selectedTrackRef = useRef(null);
  const loadedProjectIdRef = useRef(null);
  const toastShownRef = useRef(false);
  const loadingCancelledRef = useRef(false);
  const studioContentRef = useRef(null);
  const mouseThrottleRef = useRef(null);

  useEffect(() => {
    if (tracks.length === 0) {
      setDuration(0);
      return;
    }

    const maxDur = Math.max(...tracks.map(t => (t.startTime || 0) + (t.duration || 0)));
    if (maxDur > 0) {
      setDuration(maxDur);
    }
  }, [tracks]);

  useEffect(() => {
    if (selectedTrack) {
      selectedTrackRef.current = selectedTrack;
    }
  }, [selectedTrack]);

  useEffect(() => {
    if (selectedTrack) {
      const updatedSelectedTrack = tracks.find(t => t.id === selectedTrack.id);
      if (updatedSelectedTrack) {
        setSelectedTrack(updatedSelectedTrack);
        selectedTrackRef.current = updatedSelectedTrack;
      }
    }
  }, [tracks, selectedTrack]);

  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          
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

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleFileUpload = async (file) => {
    try {
      showToast('Carregando áudio...', 'info');
      
      const tempUrl = URL.createObjectURL(file);
      const audio = new Audio(tempUrl);
      
      audio.addEventListener('loadedmetadata', async () => {
        const trackDuration = audio.duration;
        
        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            const audioUrl = reader.result;
            
            const newTrack = {
              id: Date.now(),
              trackId: null,
              name: file.name.replace(/\.[^/.]+$/, ""),
              file: file,
              url: audioUrl,
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
              
              const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
              setDuration(maxDur);
              
              return updatedTracks;
            });
            
            if (!selectedTrack) {
              setSelectedTrack(newTrack);
            }
            
            // Notificar outros usuários sobre a nova track
            if (currentProjectId) {
              console.log('Notificando track adicionada:', newTrack.name, 'currentProjectId:', currentProjectId);
              // Não enviar o arquivo/url (muito grande para WebSocket)
              const trackForSync = {
                id: newTrack.id,
                name: newTrack.name,
                duration: newTrack.duration,
                startTime: newTrack.startTime,
                volume: newTrack.volume,
                pan: newTrack.pan,
                solo: newTrack.solo,
                mute: newTrack.mute,
                color: newTrack.color,
                // url e file são muito grandes para enviar via WebSocket
                // Outros usuários verão a track quando o projeto for salvo
                isTemporary: true
              };
              notifyTrackAdded(trackForSync);
            }
            
            showToast('Áudio carregado com sucesso! Lembre-se de salvar o projeto.', 'success');
            
            URL.revokeObjectURL(tempUrl);
          };
          
          reader.onerror = () => {
            showToast('Erro ao processar arquivo de áudio', 'error');
            URL.revokeObjectURL(tempUrl);
          };
          
          reader.readAsDataURL(file);
        } catch (error) {
          showToast('Erro ao processar arquivo de áudio', 'error');
          URL.revokeObjectURL(tempUrl);
        }
      });
      
      audio.addEventListener('error', () => {
        showToast('Erro ao carregar arquivo de áudio', 'error');
        URL.revokeObjectURL(tempUrl);
      });
    } catch (error) {
      showToast('Erro ao processar arquivo de áudio', 'error');
    }
  };

  const getRandomColor = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Gerar cor única baseada no ID do usuário (consistente entre sessões)
  const getUserColor = (userId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#A29BFE', '#FD79A8', '#74B9FF',
      '#55EFC4', '#FF7675', '#FDCB6E', '#E17055',
      '#D63031', '#00B894', '#00CEC9', '#0984E3'
    ];
    
    // Usar hash simples do userId para escolher cor consistente
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
  };

  const handleTrackDelete = useCallback((trackId) => {
      setTracks(prevTracks => {
        const updatedTracks = prevTracks.filter(t => t.id !== trackId);
        
        if (selectedTrack?.id === trackId) {
          setSelectedTrack(updatedTracks[0] || null);
        }
        
        if (updatedTracks.length > 0) {
        const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
        setDuration(maxDur);
      } else {
        setDuration(0);
      }
      
      return updatedTracks;
    });
    
    // Notificar outros usuários sobre a deleção
    if (currentProjectId) {
      notifyTrackDeleted(trackId);
    }
  }, [selectedTrack, currentProjectId, notifyTrackDeleted]);

  // Ref para debounce de notificações
  const notificationTimerRef = useRef(null);
  const lockTimerRef = useRef(null);

  const handleTrackUpdate = async (trackId, updates) => {
    console.log('handleTrackUpdate CHAMADO - trackId:', trackId, 'updates:', updates, 'currentProjectId:', currentProjectId);
    
    // Mudanças de posição (startTime) não precisam de lock imediato
    const isPositionChange = updates.startTime !== undefined && Object.keys(updates).length === 1;
    const isMinorChange = updates.selectedRegion !== undefined || isPositionChange;

    // Verificar se a track está bloqueada por outro usuário (apenas para mudanças importantes)
    if (!isMinorChange && isTrackLocked(trackId) && editingTrackId !== trackId) {
      const locker = getTrackLocker(trackId);
      showToast(`Esta track está sendo editada por ${locker?.userName}`, 'warning');
      return;
    }

    // Solicitar bloqueio apenas para mudanças importantes (não para posição ou seleção de região)
    if (!isMinorChange && (!editingTrackId || editingTrackId !== trackId)) {
      try {
        await requestLock(trackId);
        setEditingTrackId(trackId);
        showToast('Você está editando esta track', 'info', 2000);
      } catch (error) {
        showToast(error.message || 'Não foi possível bloquear a track', 'error');
        return;
      }
    }

    // Atualizar estado local imediatamente
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === trackId ? { ...track, ...updates } : track
      )
    );

    // Notificar outros usuários com debounce para mudanças de posição
    if (currentProjectId && !updates.selectedRegion) {
      console.log('Notificando atualização de track - currentProjectId:', currentProjectId, 'trackId:', trackId, 'updates:', updates);
      if (isPositionChange) {
        // Debounce para mudanças de posição (evitar spam durante drag)
        if (notificationTimerRef.current) {
          clearTimeout(notificationTimerRef.current);
        }
        notificationTimerRef.current = setTimeout(() => {
          notifyTrackUpdated(trackId, updates);
        }, 150);
      } else {
        // Notificação imediata para outras mudanças
        notifyTrackUpdated(trackId, updates);
      }
    } else {
      console.log('Notificação NÃO enviada - currentProjectId:', currentProjectId, 'updates.selectedRegion:', updates.selectedRegion);
    }

    // Liberar bloqueio após 3 segundos de inatividade (apenas para mudanças importantes)
    if (!isMinorChange) {
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }
      lockTimerRef.current = setTimeout(() => {
        if (editingTrackId === trackId) {
          releaseLock(trackId);
          setEditingTrackId(null);
        }
      }, 3000);
    }
  };

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = (percentage) => {
    const newTime = percentage * duration;
    setCurrentTime(newTime);
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  useEffect(() => {
    // Reset flags quando projectId muda
    if (loadedProjectIdRef.current !== projectId) {
      toastShownRef.current = false;
      loadingCancelledRef.current = false;
    }
    
    // Marca como não cancelado para esta execução
    loadingCancelledRef.current = false;

    const loadProject = async () => {
      if (!projectId) {
        setIsLoading(false);
        loadedProjectIdRef.current = null;
        toastShownRef.current = false;
        return;
      }

      // Evita carregar o mesmo projeto múltiplas vezes
      // Marca ANTES de começar para prevenir execuções simultâneas
      if (loadedProjectIdRef.current === projectId && toastShownRef.current) {
        return;
      }
      
      // Marca imediatamente para prevenir execuções duplicadas
      if (loadedProjectIdRef.current === projectId) {
        return;
      }
      
      // Marca o projeto como sendo carregado ANTES de começar
      loadedProjectIdRef.current = projectId;

      try {
        setIsLoading(true);
        const project = await projectService.getProject(projectId);
        
        if (loadingCancelledRef.current) return;
        
        setCurrentProjectId(project.id);
        setProjectName(project.title || 'Novo Projeto');
        setProjectOwner(project.owner);
        
        const dbTracks = await trackService.getProjectTracks(project.id);
        
        if (loadingCancelledRef.current) return;
        
        const restoredTracks = await Promise.all(
          dbTracks.map(async (dbTrack) => {
            try {
              const audioUrl = await trackService.getTrackAudio(dbTrack.id);
              
              return {
                id: dbTrack.id,
                trackId: dbTrack.id,
                name: dbTrack.name,
                url: audioUrl,
                duration: dbTrack.duration || 0,
                startTime: 0,
                volume: 75,
                pan: 0,
                solo: false,
                mute: false,
                color: getRandomColor()
              };
            } catch (error) {
              return null;
            }
          })
        );
        
        if (loadingCancelledRef.current) return;
        
        const validTracks = restoredTracks.filter(t => t !== null);
        
        if (project.state) {
          const state = project.state;
          
          if (state.tracks && state.tracks.length > 0) {
            const mergedTracks = validTracks.map(dbTrack => {
              const stateTrack = state.tracks.find(st => st.trackId === dbTrack.trackId || st.id === dbTrack.id);
              
              if (stateTrack) {
                return {
                  ...dbTrack,
                  startTime: stateTrack.startTime || 0,
                  volume: stateTrack.volume || 75,
                  pan: stateTrack.pan || 0,
                  solo: stateTrack.solo || false,
                  mute: stateTrack.mute || false,
                  color: stateTrack.color || dbTrack.color,
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
          setTracks(validTracks);
        }
        
        // Marca o projeto como carregado e mostra o toast apenas uma vez
        // Verifica se ainda é o mesmo projeto que começamos a carregar
        if (!loadingCancelledRef.current && loadedProjectIdRef.current === projectId && !toastShownRef.current) {
          toastShownRef.current = true;
          showToast('Projeto carregado com sucesso!', 'success');
        }
      } catch (error) {
        if (loadingCancelledRef.current) return;
        
        // Só reseta se ainda for o mesmo projeto que começamos a carregar
        if (loadedProjectIdRef.current === projectId) {
          loadedProjectIdRef.current = null;
          toastShownRef.current = false;
        }
        if (error.response?.status === 404 || error.response?.status === 403) {
          showToast(
            error.response?.data?.message || 'Projeto não encontrado ou você não tem permissão para acessá-lo',
            'error'
          );
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          showToast('Erro ao carregar projeto. Você pode criar um novo projeto aqui.', 'warning');
          setCurrentProjectId(null);
        }
      } finally {
        if (!loadingCancelledRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadProject();
    
    // Cleanup function para cancelar operações pendentes
    return () => {
      loadingCancelledRef.current = true;
    };
  }, [projectId]);

  // Entrar/sair do projeto via WebSocket para colaboração
  useEffect(() => {
    console.log('StudioPage useEffect [currentProjectId, user] - currentProjectId:', currentProjectId, 'user:', user?.name);
    if (currentProjectId && user) {
      console.log('StudioPage: Chamando joinProject com:', currentProjectId);
      joinProject(currentProjectId);
      
      return () => {
        console.log('StudioPage: Cleanup - chamando leaveProject');
        leaveProject(currentProjectId);
        
        // Liberar bloqueio se estiver editando
        if (editingTrackId) {
          releaseLock(editingTrackId);
        }
        
        // Limpar timers pendentes
        if (notificationTimerRef.current) {
          clearTimeout(notificationTimerRef.current);
        }
        if (lockTimerRef.current) {
          clearTimeout(lockTimerRef.current);
        }
      };
    }
  }, [currentProjectId, user, joinProject, leaveProject]);

  // Atualizar posição do cursor para outros usuários
  useEffect(() => {
    if (currentProjectId && !isPlaying) {
      const debounceTimer = setTimeout(() => {
        updateCursor(currentTime);
      }, 100);
      
      return () => clearTimeout(debounceTimer);
    }
  }, [currentTime, currentProjectId, isPlaying, updateCursor]);

  // Trackear movimento do mouse para cursor colaborativo
  useEffect(() => {
    if (!currentProjectId || !isConnected || !studioContentRef.current) return;

    const handleMouseMove = (e) => {
      const container = studioContentRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // Throttle: enviar no máximo a cada 50ms
      if (mouseThrottleRef.current) {
        clearTimeout(mouseThrottleRef.current);
      }

      mouseThrottleRef.current = setTimeout(() => {
        if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
          updateMousePosition({ x, y });
        }
      }, 50);
    };

    const container = studioContentRef.current;
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      if (mouseThrottleRef.current) {
        clearTimeout(mouseThrottleRef.current);
      }
    };
  }, [currentProjectId, isConnected, updateMousePosition]);

  // Escutar eventos de sincronização de tracks
  useEffect(() => {
    console.log('StudioPage: Registrando handlers de sincronização. currentProjectId:', currentProjectId, 'isConnected:', isConnected);
    if (!currentProjectId || !isConnected) {
      console.log('StudioPage: Não registrando handlers - aguardando conexão');
      return;
    }

    // Handler para quando uma track é adicionada por outro usuário
    const handleTrackAdded = (data) => {
      console.log('Track adicionada por outro usuário:', data);
      const { track, userName } = data;
      
      // Verificar se a track já existe (evitar duplicação)
      setTracks(prevTracks => {
        const exists = prevTracks.some(t => t.id === track.id);
        if (exists) {
          console.log('Track já existe, ignorando');
          return prevTracks;
        }
        
        // Se for temporária (não salva ainda), criar placeholder visual
        const trackToAdd = track.isTemporary ? {
          ...track,
          url: null, // Sem áudio até salvar
          file: null,
          isTemporary: true,
          isPlaceholder: true // Flag para renderizar diferente
        } : track;
        
        showToast(`${userName} adicionou "${track.name}". Aguarde ${userName} salvar o projeto para ouvir.`, 'info', 5000);
        return [...prevTracks, trackToAdd];
      });
    };

    // Handler para quando uma track é atualizada por outro usuário
    const handleTrackUpdated = (data) => {
      console.log('Track atualizada por outro usuário:', data);
      const { trackId, updates, userName } = data;
      
      setTracks(prevTracks => {
        const updatedTracks = prevTracks.map(track => 
          track.id === trackId ? { ...track, ...updates } : track
        );
        
        // Recalcular duração se a posição mudou
        if (updates.startTime !== undefined && updatedTracks.length > 0) {
          const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
          setDuration(maxDur);
        }
        
        // Mostrar toast apenas para mudanças significativas
        // Usar prevTracks para evitar problemas de closure
        if (updates.name) {
          showToast(`${userName} renomeou uma faixa`, 'info', 2000);
        } else if (updates.startTime !== undefined) {
          const track = prevTracks.find(t => t.id === trackId);
          if (track) {
            showToast(`${userName} moveu "${track.name}"`, 'info', 1500);
          }
        } else if (updates.volume !== undefined || updates.pan !== undefined) {
          // Não mostrar toast para mudanças de volume/pan
        } else {
          showToast(`${userName} editou uma faixa`, 'info', 2000);
        }
        
        return updatedTracks;
      });
    };

    // Handler para quando uma track é deletada por outro usuário
    const handleTrackDeleted = (data) => {
      console.log('Track deletada por outro usuário:', data);
      const { trackId, userName } = data;
      
      setTracks(prevTracks => {
        const track = prevTracks.find(t => t.id === trackId);
        if (track) {
          showToast(`${userName} removeu a faixa "${track.name}"`, 'warning');
        }
        return prevTracks.filter(t => t.id !== trackId);
      });
      
      // Se a track deletada era a selecionada, limpar seleção
      setSelectedTrack(prev => prev?.id === trackId ? null : prev);
    };

    // Registrar listeners
    console.log('StudioPage: Registrando listeners para track-added, track-updated, track-deleted');
    on('track-added', handleTrackAdded);
    on('track-updated', handleTrackUpdated);
    on('track-deleted', handleTrackDeleted);
    console.log('StudioPage: Listeners registrados com sucesso');

    // Cleanup: remover listeners
    return () => {
      console.log('StudioPage: Removendo listeners de sincronização');
      off('track-added', handleTrackAdded);
      off('track-updated', handleTrackUpdated);
      off('track-deleted', handleTrackDeleted);
    };
  }, [currentProjectId, isConnected, on, off, showToast]);

  const processAudioSegment = async (track) => {
    try {
      const response = await fetch(track.url);
      const arrayBuffer = await response.arrayBuffer();
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;
      const deletedRegions = track.deletedRegions || [];
      
      let workingBuffer = audioBuffer;
      if (track.isSegment) {
        const trimStart = track.trimStart || 0;
        const trimEnd = track.trimEnd || audioBuffer.duration;
        
        const startSample = Math.floor(trimStart * sampleRate);
        const endSample = Math.floor(trimEnd * sampleRate);
        
        const segmentLength = endSample - startSample;
        const segmentBuffer = audioContext.createBuffer(numberOfChannels, segmentLength, sampleRate);
        
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sourceData = audioBuffer.getChannelData(channel);
          const destData = segmentBuffer.getChannelData(channel);
          
          for (let i = 0; i < segmentLength; i++) {
            const sourceIndex = startSample + i;
            if (sourceIndex < sourceData.length) {
              destData[i] = sourceData[sourceIndex];
            }
          }
        }
        
        workingBuffer = segmentBuffer;
      }
      
      let finalBuffer = workingBuffer;
      if (deletedRegions.length > 0) {
        const bufferLength = workingBuffer.length;
        const bufferDuration = workingBuffer.duration;
        
        const trimStart = track.isSegment ? (track.trimStart || 0) : 0;
        const relevantRegions = deletedRegions
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
        
        if (relevantRegions.length > 0) {
          let totalLength = bufferLength;
          for (const region of relevantRegions) {
            totalLength -= (region.end - region.start);
          }
          
          const cleanedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);
          
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const sourceData = workingBuffer.getChannelData(channel);
            const destData = cleanedBuffer.getChannelData(channel);
            
            let destIndex = 0;
            let sourceIndex = 0;
            
            for (const region of relevantRegions) {
              const beforeLength = region.start - sourceIndex;
              for (let i = 0; i < beforeLength; i++) {
                destData[destIndex++] = sourceData[sourceIndex++];
              }
              sourceIndex = region.end;
            }
            
            while (sourceIndex < bufferLength && destIndex < totalLength) {
              destData[destIndex++] = sourceData[sourceIndex++];
            }
          }
          
          finalBuffer = cleanedBuffer;
        }
      }
      
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
      throw error;
    }
  };

  const handleSave = useCallback(async () => {
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

      let projectId = currentProjectId;
      if (!projectId) {
        const projectData = {
          title: projectName.trim() || 'Novo Projeto',
          state: null
        };
        const newProject = await projectService.createProject(projectData);
        projectId = newProject.id;
        setCurrentProjectId(projectId);
        window.history.pushState({}, '', `/studio/${projectId}`);
      }

      const existingDbTracks = await trackService.getProjectTracks(projectId);
      const existingTrackIds = new Set(existingDbTracks.map(t => t.id));

      const trackIdMap = new Map();
      const processedTracks = [];
      const tracksToKeep = new Set();

      for (const track of tracks) {
        try {
          const needsProcessing = track.isSegment || 
            (track.deletedRegions && track.deletedRegions.length > 0) ||
            (track.trimStart !== null && track.trimStart > 0) ||
            (track.trimEnd !== null);

          if (track.trackId && existingTrackIds.has(track.trackId) && !needsProcessing) {
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

          let audioFile = track.file;
          let trackName = track.name;
          
          if (needsProcessing) {
            showToast(`Processando ${track.isSegment ? 'segmento' : 'faixa'}: ${track.name}...`, 'info');
            audioFile = await processAudioSegment(track);
            if (track.isSegment) {
              trackName = `${track.name}_segment`;
            }
          }

          if (!audioFile) {
            continue;
          }

          const trackData = {
            name: trackName,
            startTime: track.startTime || 0,
            volume: track.volume || 75,
            pan: track.pan || 0,
            color: track.color
          };

          const uploadedTrack = await trackService.createTrack(projectId, audioFile, trackData);
          
          if (track.duration) {
            await trackService.updateTrack(uploadedTrack.id, { duration: Math.floor(track.duration) });
          }

          if (track.trackId && existingTrackIds.has(track.trackId)) {
            try {
              await trackService.deleteTrack(track.trackId);
            } catch (error) {
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
          showToast(`Erro ao processar ${track.name}. Continuando...`, 'warning');
        }
      }

      for (const dbTrack of existingDbTracks) {
        if (!tracksToKeep.has(dbTrack.id)) {
          try {
            await trackService.deleteTrack(dbTrack.id);
          } catch (error) {
          }
        }
      }

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
          trimStart: null,
          trimEnd: null,
          deletedRegions: [],
          isSegment: false
        })),
        masterVolume: masterVolume,
        zoom: zoom,
        currentTime: currentTime
      };

      const projectData = {
        title: projectName.trim() || 'Novo Projeto',
        state: projectState
      };

      await projectService.updateProject(projectId, projectData);

      setTracks(processedTracks);

      showToast('Projeto salvo com sucesso!', 'success');
    } catch (error) {
      showToast(
        error.response?.data?.message || 'Erro ao salvar projeto. Tente novamente.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  }, [user, tracks, currentProjectId, projectName, showToast, masterVolume, zoom, currentTime]);


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

  const mapTimelineToAudioTime = useCallback((timelineTime, deletedRegions, trimStart) => {
    if (!deletedRegions || deletedRegions.length === 0) {
      return trimStart + timelineTime;
    }
    
    const sortedRegions = [...deletedRegions].sort((a, b) => a.start - b.start);
    
    let accumulatedTime = 0;
    let audioPosition = trimStart;
    
    for (const region of sortedRegions) {
      const distanceToRegion = region.start - audioPosition;
      
      if (accumulatedTime + distanceToRegion >= timelineTime) {
        const remaining = timelineTime - accumulatedTime;
        const result = audioPosition + remaining;
        return result;
      }
      
      accumulatedTime += distanceToRegion;
      audioPosition = region.end;
    }
    
    const remaining = timelineTime - accumulatedTime;
    const result = audioPosition + remaining;
    return result;
  }, []);

  const handleCopyRegion = useCallback((trackId, region) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || !region) return;

    const trimStart = track.trimStart || 0;
    const deletedRegions = track.deletedRegions || [];

    const adjustedRegion = {
      start: mapTimelineToAudioTime(region.start, deletedRegions, trimStart),
      end: mapTimelineToAudioTime(region.end, deletedRegions, trimStart)
    };

    setClipboard({
      trackId: track.trackId || track.id,
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
  }, [tracks, showToast, mapTimelineToAudioTime]);

  const handleDeleteRegion = useCallback((trackId, region) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || !region) return;

    const regionDuration = region.end - region.start;
    const trimStart = track.trimStart || 0;
    const deletedRegions = track.deletedRegions || [];

    const absoluteRegion = {
      start: mapTimelineToAudioTime(region.start, deletedRegions, trimStart),
      end: mapTimelineToAudioTime(region.end, deletedRegions, trimStart)
    };

    const updatedDeletedRegions = [
      ...deletedRegions,
      absoluteRegion
    ].sort((a, b) => a.start - b.start);

    const newDuration = track.duration - regionDuration;

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
      
      if (updated.length > 0) {
        const maxDur = Math.max(...updated.map(t => (t.startTime || 0) + (t.duration || 0)));
        setDuration(maxDur);
      }
      
      return updated;
    });

    showToast(`${regionDuration.toFixed(1)}s removido de ${track.name}`, 'success');
  }, [tracks, showToast, mapTimelineToAudioTime]);

  const handleCutRegion = useCallback((trackId, region) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || !region) return;

    const trimStart = track.trimStart || 0;
    const deletedRegions = track.deletedRegions || [];

    const adjustedRegion = {
      start: mapTimelineToAudioTime(region.start, deletedRegions, trimStart),
      end: mapTimelineToAudioTime(region.end, deletedRegions, trimStart)
    };

    setClipboard({
      trackId: track.trackId || track.id,
      trackName: track.name,
      audioUrl: track.url,
      audioFile: track.file,
      region: adjustedRegion,
      color: track.color,
      originalDuration: track.duration,
      isCut: true
    });

    handleDeleteRegion(trackId, region);

    const duration = (region.end - region.start).toFixed(1);
    showToast(`Região recortada: ${track.name} (${duration}s)`, 'success');
  }, [tracks, showToast, handleDeleteRegion, mapTimelineToAudioTime]);

  const handlePaste = useCallback(() => {
    if (!clipboard) {
      showToast('Nenhuma região copiada. Copie uma região primeiro.', 'warning');
      return;
    }

    let originalTrack = tracks.find(t => t.id === clipboard.trackId || t.trackId === clipboard.trackId);
    
    if (originalTrack?.isSegment && originalTrack?.trackId) {
      const originalDbTrack = tracks.find(t => (t.id === originalTrack.trackId || t.trackId === originalTrack.trackId) && !t.isSegment);
      if (originalDbTrack) {
        originalTrack = originalDbTrack;
      }
    }
    
    const originalTrackId = originalTrack?.trackId || originalTrack?.id || clipboard.trackId;

    const segmentDuration = clipboard.region.end - clipboard.region.start;
    
    const newTrack = {
      id: Date.now(),
      trackId: originalTrackId,
      name: `${clipboard.trackName} (Segmento)`,
      file: clipboard.audioFile,
      url: clipboard.audioUrl,
      duration: segmentDuration,
      startTime: currentTime,
      trimStart: clipboard.region.start,
      trimEnd: clipboard.region.end,
      volume: 75,
      pan: 0,
      solo: false,
      mute: false,
      color: clipboard.color,
      isSegment: true
    };

    setTracks(prevTracks => {
      const updatedTracks = [...prevTracks, newTrack];
      
      const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
      setDuration(maxDur);
      
      return updatedTracks;
    });

    const timeStr = `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`;
    showToast(`Segmento colado em ${timeStr}`, 'success');
  }, [clipboard, currentTime, showToast, tracks]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        
        const currentTrack = selectedTrackRef.current || selectedTrack;
        const trackFromArray = currentTrack ? tracks.find(t => t.id === currentTrack.id) : null;
        const trackToUse = trackFromArray || currentTrack;
        
        if (trackToUse && trackToUse.selectedRegion) {
          handleCopyRegion(trackToUse.id, trackToUse.selectedRegion);
        } else {
          showToast('Selecione uma região na forma de onda primeiro', 'warning');
        }
      }

      if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        
        const currentTrack = selectedTrackRef.current || selectedTrack;
        const trackFromArray = currentTrack ? tracks.find(t => t.id === currentTrack.id) : null;
        const trackToUse = trackFromArray || currentTrack;
        
        if (trackToUse && trackToUse.selectedRegion) {
          handleCutRegion(trackToUse.id, trackToUse.selectedRegion);
        } else {
          showToast('Selecione uma região na forma de onda primeiro', 'warning');
        }
      }

      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      }

      if (e.key === 's' && !e.ctrlKey) {
        e.preventDefault();
        handleStop();
      }

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      if (e.key === 'Delete' && selectedTrack) {
        e.preventDefault();
        
        if (selectedTrack.selectedRegion) {
          handleDeleteRegion(selectedTrack.id, selectedTrack.selectedRegion);
        } else {
          handleTrackDelete(selectedTrack.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTrack, clipboard, currentTime, isPlaying, tracks, showToast, handleCopyRegion, handleCutRegion, handleDeleteRegion, handlePaste, handlePlayPause, handleStop, handleSave, handleTrackDelete]);

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
      <header className="studio-header">
        <div className="header-left">
          <div 
            className="logo" 
            onClick={() => navigate('/dashboard')}
            title="Voltar ao Dashboard"
          >
            🎵 MusicCollab Studio
          </div>
          <input 
            type="text" 
            className="project-name-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Nome do Projeto"
          />
        </div>
        <div className="header-center">
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

      <div className="studio-content audacity-layout" ref={studioContentRef} style={{ position: 'relative' }}>
        {/* Cursores colaborativos */}
        {currentProjectId && onlineUsers
          .filter(u => u.userId !== user?.id && u.mousePosition)
          .map(u => (
            <CollaborativeCursor
              key={u.socketId}
              user={{ ...u, cursorColor: getUserColor(u.userId) }}
              containerRef={studioContentRef}
            />
          ))}

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
              <span>Duração:</span>
              <strong>{formatTime(duration)}</strong>
            </div>
            <div className="info-item">
              <span>Status:</span>
              <strong>{isPlaying ? '▶ Tocando' : '⏸ Pausado'}</strong>
            </div>
          </div>

          {currentProjectId && (
            <>
              <div className="sidebar-section">
                <h3>Colaboração</h3>
                <button 
                  className="collaborators-btn"
                  onClick={() => setShowCollaboratorsPanel(true)}
                  title="Gerenciar colaboradores"
                >
                  👥 Colaboradores
                </button>
              </div>

              <div className="sidebar-section">
                <OnlineUsers users={onlineUsers} />
              </div>
            </>
          )}

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
              {currentProjectId && onlineUsers.length > 0 && (
                <UserCursors 
                  users={onlineUsers.filter(u => u.userId !== user?.id)} 
                  duration={duration} 
                  zoom={zoom} 
                />
              )}
              <div className="timeline-tracks">
                {tracks.map(track => {
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

      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectName={projectName}
        tracks={tracks}
        duration={duration}
      />

      {showCollaboratorsPanel && currentProjectId && (
        <CollaboratorsPanel
          projectId={currentProjectId}
          isOwner={projectOwner?.id === user?.id}
          onClose={() => setShowCollaboratorsPanel(false)}
        />
      )}

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default StudioPage;
