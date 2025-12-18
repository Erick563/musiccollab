import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
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
    joinProject,
    leaveProject,
    updateMousePosition,
    requestLock,
    releaseLock,
    requestProjectLock,
    releaseProjectLock,
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
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [projectLocked, setProjectLocked] = useState(false);
  const [projectLockedBy, setProjectLockedBy] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const playbackIntervalRef = useRef(null);
  const selectedTrackRef = useRef(null);
  const loadedProjectIdRef = useRef(null);
  const toastShownRef = useRef(false);
  const loadingCancelledRef = useRef(false);
  const studioContentRef = useRef(null);
  const mouseThrottleRef = useRef(null);
  const tracksRef = useRef([]);
  const masterVolumeRef = useRef(75);
  const zoomRef = useRef(1);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  // Manter refs sincronizados para uso em callbacks
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    masterVolumeRef.current = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

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

  const autoSaveProjectState = useCallback(async (currentTracks, skipToast = false) => {
    const projectIdToUse = currentProjectId || projectId;
    
    if (!projectIdToUse) {
      console.warn('[Auto-save] Nenhum projeto ativo para salvar');
      return;
    }

    try {
      const projectState = {
        tracks: currentTracks.map(track => ({
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
          trimStart: track.trimStart || null,
          trimEnd: track.trimEnd || null,
          deletedRegions: track.deletedRegions || [],
          isSegment: track.isSegment || false
        })),
        masterVolume: masterVolumeRef.current,
        zoom: zoomRef.current,
        currentTime: currentTimeRef.current
      };

      const projectData = {
        title: projectName.trim() || 'Novo Projeto',
        state: projectState
      };

      await projectService.updateProject(projectIdToUse, projectData);
      
      if (!skipToast) {
        console.log('[Auto-save] Estado do projeto salvo com sucesso');
      }
    } catch (error) {
      console.error('[Auto-save] Erro ao salvar estado:', error);
    }
  }, [currentProjectId, projectId, projectName]);

  const autoSaveSettingsTimerRef = useRef(null);
  useEffect(() => {
    if (!currentProjectId || isLoading) return;

    if (autoSaveSettingsTimerRef.current) {
      clearTimeout(autoSaveSettingsTimerRef.current);
    }

    autoSaveSettingsTimerRef.current = setTimeout(async () => {
      await autoSaveProjectState(tracksRef.current, true);
    }, 1000);
  }, [masterVolume, zoom, currentProjectId, isLoading, autoSaveProjectState]);

  const handleFileUpload = async (file) => {
    if (currentUserRole === 'VIEWER') {
      showToast('Você não tem permissão para adicionar faixas. Sua permissão é apenas de visualização.', 'error');
      return;
    }

    try {
      showToast('Carregando áudio...', 'info');

      const tempUrl = URL.createObjectURL(file);
      const audio = new Audio(tempUrl);

      audio.addEventListener('loadedmetadata', async () => {
        const trackDuration = audio.duration;

        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const audioUrl = reader.result;

            const tempId = Date.now();
            const newTrack = {
              id: tempId,
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

            // Adicionar track temporariamente ao estado local
            setTracks(prevTracks => {
              const updatedTracks = [...prevTracks, newTrack];

              const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
              setDuration(maxDur);

              return updatedTracks;
            });

            if (!selectedTrack) {
              setSelectedTrack(newTrack);
            }

            // AUTO-SAVE: Salvar imediatamente no banco de dados
            const projectIdToUse = currentProjectId || projectId;

            if (projectIdToUse) {
              showToast('Áudio carregado! Salvando automaticamente...', 'info');

              try {
                const trackData = {
                  name: newTrack.name,
                  startTime: newTrack.startTime || 0,
                  volume: newTrack.volume || 75,
                  pan: newTrack.pan || 0,
                  color: newTrack.color
                };


                // Fazer upload da track para o servidor
                const uploadedTrack = await trackService.createTrack(projectIdToUse, file, trackData);


                // Atualizar duração
                await trackService.updateTrack(uploadedTrack.id, { duration: Math.floor(trackDuration) });

                // Atualizar estado local com o ID real do banco
                let updatedTracks = [];
                setTracks(prevTracks => {
                  updatedTracks = prevTracks.map(t =>
                    t.id === tempId
                      ? { ...t, id: uploadedTrack.id, trackId: uploadedTrack.id }
                      : t
                  );
                  return updatedTracks;
                });

                // Aguardar um pouco para o estado ser atualizado
                await new Promise(resolve => setTimeout(resolve, 100));

                // Salvar estado completo do projeto
                const projectState = {
                  tracks: updatedTracks.map(track => ({
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

                await projectService.updateProject(projectIdToUse, projectData);

                // Notificar outros usuários sobre a nova track SALVA
                const trackForSync = {
                  id: uploadedTrack.id,
                  trackId: uploadedTrack.id,
                  name: newTrack.name,
                  duration: newTrack.duration,
                  startTime: newTrack.startTime,
                  volume: newTrack.volume,
                  pan: newTrack.pan,
                  solo: newTrack.solo,
                  mute: newTrack.mute,
                  color: newTrack.color,
                  isTemporary: false
                };

                notifyTrackAdded(trackForSync);

                showToast('Track salva e sincronizada com sucesso!', 'success');
              } catch (error) {
                console.error('Erro no auto-save:', error);
                showToast('Erro ao salvar track automaticamente. Tente salvar o projeto manualmente.', 'error');
              }
            } else {
              showToast('Áudio carregado! Crie ou abra um projeto para compartilhar.', 'warning');
            }

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

  const handleTrackDelete = useCallback(async (trackId) => {
    if (currentUserRole === 'VIEWER') {
      showToast('Você não tem permissão para deletar faixas. Sua permissão é apenas de visualização.', 'error');
      return;
    }

    let updatedTracks = [];
    setTracks(prevTracks => {
      updatedTracks = prevTracks.filter(t => t.id !== trackId);

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

    if (currentProjectId) {
      notifyTrackDeleted(trackId);
      
      try {
        await trackService.deleteTrack(trackId);
        
        await autoSaveProjectState(updatedTracks, true);
        
        console.log(`[Auto-save] Track ${trackId} deletada do banco e estado salvo`);
      } catch (error) {
        console.error('[Auto-save] Erro ao deletar track:', error);
        showToast('Erro ao deletar track. Tente novamente.', 'error');
      }
    }
  }, [selectedTrack, currentProjectId, notifyTrackDeleted, currentUserRole, showToast, autoSaveProjectState]);

  const notificationTimerRef = useRef(null);
  const lockTimerRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  const handleTrackUpdate = async (trackId, updates) => {
    // Bloquear modificações para VIEWER
    if (currentUserRole === 'VIEWER') {
      showToast('Você não tem permissão para modificar faixas. Sua permissão é apenas de visualização.', 'error');
      return;
    }

    const isPositionChange = updates.startTime !== undefined && Object.keys(updates).length === 1;
    const isMuteChange = updates.mute !== undefined && Object.keys(updates).length === 1;
    const isSoloChange = updates.solo !== undefined && Object.keys(updates).length === 1;
    const isVolumeChange = updates.volume !== undefined && Object.keys(updates).length === 1;
    const isPanChange = updates.pan !== undefined && Object.keys(updates).length === 1;
    const isMinorChange = updates.selectedRegion !== undefined || isPositionChange ||
      isMuteChange || isSoloChange || isVolumeChange || isPanChange;

    if (!isMinorChange && isTrackLocked(trackId) && editingTrackId !== trackId) {
      const locker = getTrackLocker(trackId);
      showToast(`Esta track está sendo editada por ${locker?.userName}`, 'warning');
      return;
    }

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

    let updatedTracks = [];
    setTracks(prevTracks => {
      updatedTracks = prevTracks.map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      );
      return updatedTracks;
    });

    if (currentProjectId && !updates.selectedRegion) {
      if (isPositionChange) {
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
    }

    if (!updates.selectedRegion && currentProjectId) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      const delay = isPositionChange ? 500 : 300;
      autoSaveTimerRef.current = setTimeout(async () => {
        await autoSaveProjectState(updatedTracks, true);
      }, delay);
    }

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
        setCurrentUserRole(project.currentUserRole || 'VIEWER');

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

        // Aplicar estado salvo do projeto
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

        if (!loadingCancelledRef.current && loadedProjectIdRef.current === projectId && !toastShownRef.current) {
          toastShownRef.current = true;
          showToast('Projeto carregado com sucesso!', 'success');
        }
      } catch (error) {
        if (loadingCancelledRef.current) return;

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

    return () => {
      loadingCancelledRef.current = true;
    };
  }, [projectId, navigate, showToast]);

  useEffect(() => {
    if (currentProjectId && user) {
      joinProject(currentProjectId);

      return () => {
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
  }, [currentProjectId, user, joinProject, leaveProject, editingTrackId, releaseLock]);

  // Detectar quando o container está pronto
  useLayoutEffect(() => {
    if (studioContentRef.current && !isContainerReady) {
      setIsContainerReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // Trackear movimento do mouse para cursor colaborativo
  useEffect(() => {

    if (!currentProjectId || !isConnected || !studioContentRef.current || !isContainerReady) {
      return;
    }

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
  }, [currentProjectId, isConnected, isContainerReady, updateMousePosition]);


  // Escutar eventos de sincronização de tracks
  useEffect(() => {
    if (!currentProjectId || !isConnected) {
      return;
    }

    // Handler para quando uma track é adicionada por outro usuário
    const handleTrackAdded = async (data) => {
      const { track, userName } = data;

      // Verificar se a track já existe (evitar duplicação)
      const trackExists = tracksRef.current.some(t => t.id === track.id);
      if (trackExists) {
        return;
      }

      // Se a track não é temporária (foi salva), carregar do servidor
      if (!track.isTemporary && track.trackId) {
        try {
          showToast(`${userName} adicionou "${track.name}". Carregando...`, 'info');

          // Buscar o áudio do servidor
          const audioUrl = await trackService.getTrackAudio(track.trackId);

          const trackToAdd = {
            ...track,
            url: audioUrl,
            file: null
          };

          setTracks(prevTracks => [...prevTracks, trackToAdd]);
          showToast(`"${track.name}" carregada com sucesso!`, 'success');
        } catch (error) {
          console.error('Erro ao carregar track:', error);
          showToast(`Erro ao carregar "${track.name}"`, 'error');
        }
      } else {
        // Track temporária (não deveria acontecer mais com auto-save)
        const trackToAdd = {
          ...track,
          url: null,
          file: null,
          isTemporary: true,
          isPlaceholder: true
        };

        setTracks(prevTracks => [...prevTracks, trackToAdd]);
        showToast(`${userName} adicionou "${track.name}" (carregando...)`, 'info');
      }
    };

    // Handler para quando uma track é atualizada por outro usuário
    const handleTrackUpdated = (data) => {
      const { trackId, updates, userName } = data;

      setTracks(prevTracks => {
        const updatedTracks = prevTracks.map(track =>
          track.id === trackId ? { ...track, ...updates } : track
        );

        // Recalcular duração se a posição ou duração da track mudou
        if ((updates.startTime !== undefined || updates.duration !== undefined) && updatedTracks.length > 0) {
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
        } else if (updates.deletedRegions !== undefined) {
          const track = prevTracks.find(t => t.id === trackId);
          if (track) {
            showToast(`${userName} editou "${track.name}"`, 'info', 2000);
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

    // Handler para quando o projeto é bloqueado globalmente
    const handleProjectLocked = (data) => {
      const { userName, operation } = data;
      setProjectLocked(true);
      setProjectLockedBy({ userName, operation });
      showToast(`⚠️ Projeto travado por ${userName} (${operation})`, 'warning', 3000);
    };

    // Handler para quando o projeto é desbloqueado globalmente
    const handleProjectUnlocked = () => {
      setProjectLocked(false);
      setProjectLockedBy(null);
      showToast('✅ Projeto desbloqueado', 'success', 2000);
    };

    // Registrar listeners
    on('track-added', handleTrackAdded);
    on('track-updated', handleTrackUpdated);
    on('track-deleted', handleTrackDeleted);
    on('project-locked', handleProjectLocked);
    on('project-unlocked', handleProjectUnlocked);

    // Cleanup: remover listeners
    return () => {
      off('track-added', handleTrackAdded);
      off('track-updated', handleTrackUpdated);
      off('track-deleted', handleTrackDeleted);
      off('project-locked', handleProjectLocked);
      off('project-unlocked', handleProjectUnlocked);
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
    // Bloquear salvamento para VIEWER
    if (currentUserRole === 'VIEWER') {
      showToast('Você não tem permissão para salvar o projeto. Sua permissão é apenas de visualização.', 'error');
      return;
    }

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
  }, [user, tracks, currentProjectId, projectName, showToast, masterVolume, zoom, currentTime, currentUserRole]);


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
    // Permitir cópia mesmo para VIEWER (não modifica nada)
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

  const handleDeleteRegion = useCallback(async (trackId, region) => {
    // Bloquear deleção de região para VIEWER
    if (currentUserRole === 'VIEWER') {
      showToast('Você não tem permissão para deletar regiões. Sua permissão é apenas de visualização.', 'error');
      return;
    }

    if (!currentProjectId) {
      showToast('Salve o projeto antes de deletar regiões.', 'warning');
      return;
    }

    const track = tracks.find(t => t.id === trackId);
    if (!track || !region) return;

    let projectLocked = false;

    try {
      // 1. Solicitar lock global do projeto
      showToast('Travando projeto para operação...', 'info', 1500);
      await requestProjectLock('delete');
      projectLocked = true;

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

      // 2. Atualizar estado local
      let updatedTracks = [];
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

        updatedTracks = updated;
        return updated;
      });

      // Aguardar atualização do estado
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. Realizar auto-save do projeto
      showToast('Realizando auto-save...', 'info');
      const projectState = {
        tracks: updatedTracks.map(track => ({
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
          trimStart: track.trimStart,
          trimEnd: track.trimEnd,
          deletedRegions: track.deletedRegions || [],
          isSegment: track.isSegment || false
        })),
        masterVolume: masterVolume,
        zoom: zoom,
        currentTime: currentTime
      };

      const projectData = {
        title: projectName.trim() || 'Novo Projeto',
        state: projectState
      };

      await projectService.updateProject(currentProjectId, projectData);

      // 4. Notificar outros usuários sobre a atualização da track
      notifyTrackUpdated(trackId, {
        deletedRegions: updatedDeletedRegions,
        duration: newDuration
      });

      showToast(`${regionDuration.toFixed(1)}s removido de ${track.name} e salvo!`, 'success');

    } catch (error) {
      console.error('Erro ao deletar região:', error);
      showToast(`Erro ao deletar região: ${error.message}`, 'error');
    } finally {
      // 5. Liberar lock global do projeto
      if (projectLocked) {
        releaseProjectLock();
        showToast('Projeto desbloqueado', 'info', 1500);
      }
    }
  }, [tracks, showToast, mapTimelineToAudioTime, currentUserRole, currentProjectId, requestProjectLock, releaseProjectLock, masterVolume, zoom, currentTime, projectName, notifyTrackUpdated]);

  const handleCutRegion = useCallback(async (trackId, region) => {
    // Bloquear corte de região para VIEWER
    if (currentUserRole === 'VIEWER') {
      showToast('Você não tem permissão para recortar regiões. Sua permissão é apenas de visualização.', 'error');
      return;
    }

    if (!currentProjectId) {
      showToast('Salve o projeto antes de recortar regiões.', 'warning');
      return;
    }

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

    // Chamar handleDeleteRegion que agora também trava e faz auto-save
    await handleDeleteRegion(trackId, region);

    const duration = (region.end - region.start).toFixed(1);
    showToast(`Região recortada: ${track.name} (${duration}s)`, 'success');
  }, [tracks, showToast, handleDeleteRegion, mapTimelineToAudioTime, currentUserRole, currentProjectId]);

  const handlePaste = useCallback(async () => {
    // Bloquear colar para VIEWER
    if (currentUserRole === 'VIEWER') {
      showToast('Você não tem permissão para colar regiões. Sua permissão é apenas de visualização.', 'error');
      return;
    }

    if (!clipboard) {
      showToast('Nenhuma região copiada. Copie uma região primeiro.', 'warning');
      return;
    }

    if (!currentProjectId) {
      showToast('Salve o projeto antes de colar segmentos.', 'warning');
      return;
    }

    let projectLocked = false;

    try {
      // 1. Solicitar lock global do projeto
      showToast('Travando projeto para operação...', 'info', 1500);
      await requestProjectLock('paste');
      projectLocked = true;

      let originalTrack = tracks.find(t => t.id === clipboard.trackId || t.trackId === clipboard.trackId);

      if (originalTrack?.isSegment && originalTrack?.trackId) {
        const originalDbTrack = tracks.find(t => (t.id === originalTrack.trackId || t.trackId === originalTrack.trackId) && !t.isSegment);
        if (originalDbTrack) {
          originalTrack = originalDbTrack;
        }
      }

      const originalTrackId = originalTrack?.trackId || originalTrack?.id || clipboard.trackId;
      const segmentDuration = clipboard.region.end - clipboard.region.start;

      // 2. Criar track temporária no estado local
      const tempId = Date.now();
      const newTrack = {
        id: tempId,
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
        isSegment: true,
        deletedRegions: []
      };

      setTracks(prevTracks => {
        const updatedTracks = [...prevTracks, newTrack];
        const maxDur = Math.max(...updatedTracks.map(t => (t.startTime || 0) + (t.duration || 0)));
        setDuration(maxDur);
        return updatedTracks;
      });

      const audioFile = await processAudioSegment(newTrack);

      const trackData = {
        name: newTrack.name,
        startTime: newTrack.startTime || 0,
        volume: newTrack.volume || 75,
        pan: newTrack.pan || 0,
        color: newTrack.color
      };

      const uploadedTrack = await trackService.createTrack(currentProjectId, audioFile, trackData);

      // Atualizar duração
      await trackService.updateTrack(uploadedTrack.id, { duration: Math.floor(segmentDuration) });

      const audioUrl = await trackService.getTrackAudio(uploadedTrack.id);

      // 5. Atualizar estado local com o ID real do banco e o novo URL
      let updatedTracks = [];
      setTracks(prevTracks => {
        updatedTracks = prevTracks.map(t =>
          t.id === tempId
            ? { 
                ...t, 
                id: uploadedTrack.id, 
                trackId: uploadedTrack.id,
                url: audioUrl,           // Atualizar com o áudio processado
                isSegment: false,
                trimStart: null,
                trimEnd: null,
                deletedRegions: []
              }
            : t
        );
        return updatedTracks;
      });

      // Aguardar atualização do estado
      await new Promise(resolve => setTimeout(resolve, 100));

      const projectState = {
        tracks: updatedTracks.map(track => ({
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

      await projectService.updateProject(currentProjectId, projectData);

      // 7. Notificar outros usuários sobre a nova track
      const trackForSync = {
        id: uploadedTrack.id,
        trackId: uploadedTrack.id,
        name: newTrack.name,
        duration: segmentDuration,
        startTime: newTrack.startTime,
        volume: newTrack.volume,
        pan: newTrack.pan,
        solo: newTrack.solo,
        mute: newTrack.mute,
        color: newTrack.color,
        isTemporary: false
      };

      notifyTrackAdded(trackForSync);

      const timeStr = `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`;
      
    } catch (error) {
      console.error('Erro ao colar segmento:', error);
      showToast(`Erro ao colar segmento: ${error.message}`, 'error');
    } finally {
      // 8. Liberar lock global do projeto
      if (projectLocked) {
        releaseProjectLock();
      }
    }
  }, [clipboard, currentTime, showToast, tracks, currentUserRole, currentProjectId, requestProjectLock, releaseProjectLock, processAudioSegment, notifyTrackAdded, masterVolume, zoom, projectName]);

  const handleDeleteProject = useCallback(async () => {
    if (!currentProjectId) {
      showToast('Nenhum projeto para excluir', 'warning');
      return;
    }

    if (projectOwner?.id !== user?.id) {
      showToast('Apenas o proprietário pode excluir o projeto', 'error');
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o projeto "${projectName}"?\n\n` +
      'Esta ação não pode ser desfeita e todos os dados do projeto serão permanentemente removidos.'
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      showToast('Excluindo projeto...', 'info');

      await projectService.deleteProject(currentProjectId);

      showToast('Projeto excluído com sucesso!', 'success');

      // Redirecionar para o dashboard após breve delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      showToast(
        error.response?.data?.message || 'Erro ao excluir projeto. Tente novamente.',
        'error'
      );
      setIsDeleting(false);
    }
  }, [currentProjectId, projectOwner, user, projectName, navigate, showToast]);

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
            disabled={currentUserRole === 'VIEWER' || currentUserRole === 'COLLABORATOR'}
            title={
              currentUserRole === 'VIEWER' 
                ? 'Você não pode editar o nome do projeto (somente visualização)' 
                : currentUserRole === 'COLLABORATOR'
                ? 'Apenas proprietários e administradores podem editar o nome do projeto'
                : ''
            }
          />
          {currentUserRole === 'VIEWER' && (
            <span style={{
              backgroundColor: '#ff6b6b',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              marginLeft: '10px'
            }}>
              👁️ MODO VISUALIZAÇÃO
            </span>
          )}
          {currentUserRole === 'COLLABORATOR' && (
            <span style={{
              backgroundColor: '#4ecdc4',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              marginLeft: '10px'
            }}>
              🎵 COLABORADOR
            </span>
          )}
          {currentUserRole === 'ADMIN' && (
            <span style={{
              backgroundColor: '#45b7d1',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              marginLeft: '10px'
            }}>
              ⚙️ ADMINISTRADOR
            </span>
          )}
          {projectLocked && projectLockedBy && (
            <span style={{
              backgroundColor: '#ff9800',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
              marginLeft: '10px',
              animation: 'pulse 2s infinite'
            }}>
              🔒 TRAVADO - {projectLockedBy.userName} ({projectLockedBy.operation})
            </span>
          )}
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
            disabled={isSaving || isLoading || currentUserRole === 'VIEWER'}
            title={currentUserRole === 'VIEWER' ? 'Você não pode salvar (somente visualização)' : ''}
          >
            {isSaving ? '⏳ Salvando...' : '💾 Salvar'}
          </button>
          <button 
            className="header-btn" 
            onClick={handleExport}
            disabled={currentUserRole === 'VIEWER'}
            title={currentUserRole === 'VIEWER' ? 'Você não pode exportar (somente visualização)' : ''}
          >
            📤 Exportar
          </button>
          {currentProjectId && projectOwner?.id === user?.id && (
            <button
              className="header-btn delete-btn"
              onClick={handleDeleteProject}
              disabled={isDeleting}
              title="Excluir projeto (apenas proprietário)"
            >
              {isDeleting ? '⏳ Excluindo...' : '🗑️ Excluir'}
            </button>
          )}
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

      <div className="studio-content audacity-layout" ref={studioContentRef}>
        {/* Cursores colaborativos */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10000 }}>
          {currentProjectId && (() => {
            const filtered = onlineUsers.filter(u => u.userId !== user?.id && u.mousePosition);

            return filtered.map(u => (
              <CollaborativeCursor
                key={u.socketId}
                user={{ ...u, cursorColor: getUserColor(u.userId) }}
                containerRef={studioContentRef}
              />
            ));
          })()}
        </div>

        <aside className="studio-sidebar">
          <div className="sidebar-section">
            <h3>Upload de Áudio</h3>
            {currentUserRole === 'VIEWER' ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '2px dashed #dee2e6'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>👁️</div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Modo Visualização
                  <br />
                  <small>Você não pode adicionar arquivos</small>
                </div>
              </div>
            ) : (
              <AudioUploader onFileUpload={handleFileUpload} />
            )}
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
              {currentUserRole !== 'VIEWER' && (
                <>
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
                </>
              )}
            </div>
            {currentUserRole === 'VIEWER' && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#856404'
              }}>
                ℹ️ Modo somente visualização - Funções de edição desabilitadas
              </div>
            )}
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
                      isReadOnly={currentUserRole === 'VIEWER'}
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
          currentUserRole={currentUserRole}
          onClose={() => setShowCollaboratorsPanel(false)}
        />
      )}

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default StudioPage;
