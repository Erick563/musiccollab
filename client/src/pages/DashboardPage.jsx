import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectService } from '../services/projectService';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTracks: 0,
    longestProject: null,
    popularProjects: []
  });

  // Carregar projetos da API
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const projectsData = await projectService.getProjects();
        
        // Formatar projetos
        const formattedProjects = projectsData.map(project => ({
          id: project.id,
          name: project.title,
          duration: formatDuration(project.duration || 0),
          lastUpdated: project.updatedAt,
          tracks: project.tracksCount || 0,
          collaborators: project.collaboratorsCount || 0,
          isPublic: project.isPublic,
          status: project.status
        }));

        setProjects(formattedProjects);
        
        if (formattedProjects.length > 0) {
          setCurrentProject(formattedProjects[0]);
        }

        // Calcular estatísticas
        const longestProject = formattedProjects.reduce((prev, current) => {
          const prevDur = parseDuration(prev.duration);
          const currDur = parseDuration(current.duration);
          return prevDur > currDur ? prev : current;
        }, formattedProjects[0] || null);

        // Ordenar por última atualização (mais recentes primeiro)
        const popularProjects = [...formattedProjects]
          .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
          .slice(0, 3);

        // Contar total de tracks de todos os projetos
        const totalTracks = formattedProjects.reduce((sum, p) => sum + p.tracks, 0);

        setStats({
          totalProjects: formattedProjects.length,
          totalTracks: totalTracks,
          longestProject,
          popularProjects
        });
      } catch (error) {
        console.error('Erro ao carregar projetos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseDuration = (durationStr) => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':');
    if (parts.length !== 2) return 0;
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'há 1 dia';
    if (diffDays < 7) return `há ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR');
  };

  const handleShare = (project) => {
    if (navigator.share) {
      navigator.share({
        title: `Projeto: ${project.name}`,
        text: `Confira meu projeto musical "${project.name}" no MusicCollab!`,
        url: `${window.location.origin}/studio/${project.id}`
      });
    } else {
      // Fallback para navegadores que não suportam Web Share API
      const url = `${window.location.origin}/studio/${project.id}`;
      navigator.clipboard.writeText(url);
      alert('Link copiado para a área de transferência!');
    }
  };

  const handleExport = (project, format = 'mp3') => {
    // Simular exportação
    alert(`Exportando "${project.name}" em formato ${format.toUpperCase()}...`);
    // Em produção, isso faria uma chamada para a API de exportação
  };

  const handleDownloadMP3 = (project) => {
    // Simular download de MP3
    const link = document.createElement('a');
    link.href = '#'; // Em produção, seria a URL real do arquivo
    link.download = `${project.name}.mp3`;
    link.click();
    alert(`Baixando "${project.name}.mp3"...`);
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <h1>🎵 MusicCollab</h1>
            </div>
            <div className="user-menu">
              <span className="user-name">Olá, {user?.name}!</span>
              <button className="logout-btn" onClick={logout}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          <div className="dashboard-title">
            <h2>Dashboard</h2>
            <p>Gerencie seus projetos musicais</p>
          </div>

          {/* Estatísticas Rápidas */}
          <section className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <h3>{stats.totalProjects}</h3>
                  <p>Meus Projetos</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎵</div>
                <div className="stat-content">
                  <h3>{stats.totalTracks}</h3>
                  <p>Minhas Faixas</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <h3>{stats.longestProject?.duration || '0:00'}</h3>
                  <p>Projeto Mais Longo</p>
                </div>
              </div>
              <div 
                className="stat-card current-project" 
                onClick={() => currentProject && navigate(`/studio/${currentProject.id}`)}
                style={{ cursor: currentProject ? 'pointer' : 'default' }}
                title={currentProject ? 'Clique para abrir o projeto' : ''}
              >
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <h3>{currentProject?.name || 'Nenhum'}</h3>
                  <p>Projeto Atual</p>
                </div>
              </div>
            </div>
          </section>

          {/* Projetos Recentes */}
          {stats.popularProjects.length > 0 && (
            <section className="popular-projects-section">
              <h3>Projetos Recentes</h3>
              <div className="popular-projects-grid">
                {stats.popularProjects.map((project, index) => (
                  <div 
                    key={project.id} 
                    className="popular-project-card"
                    onClick={() => navigate(`/studio/${project.id}`)}
                    style={{ cursor: 'pointer' }}
                    title="Clique para abrir o projeto"
                  >
                    <div className="popularity-rank">#{index + 1}</div>
                    <div className="project-info">
                      <h4>{project.name}</h4>
                      <p>{formatDate(project.lastUpdated)}</p>
                      <p>{project.collaborators} colaborador{project.collaborators !== 1 ? 'es' : ''}</p>
                    </div>
                    <div className="popularity-bar">
                      <div 
                        className="popularity-fill" 
                        style={{ width: `${100 - (index * 10)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Lista de Projetos */}
          <section className="projects-section">
            <div className="section-header">
              <h3>Meus Projetos</h3>
              <button className="btn btn-primary" onClick={() => navigate('/studio')}>
                <span className="btn-icon">➕</span>
                Novo Projeto
              </button>
            </div>
            
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px' }}>⏳</div>
                <p>Carregando projetos...</p>
              </div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px' }}>🎵</div>
                <h3>Nenhum projeto ainda</h3>
                <p>Crie seu primeiro projeto para começar!</p>
                <button className="btn btn-primary" onClick={() => navigate('/studio')} style={{ marginTop: '20px' }}>
                  <span className="btn-icon">➕</span>
                  Criar Primeiro Projeto
                </button>
              </div>
            ) : (
              <div className="projects-grid">
                {projects.map(project => (
                <div 
                  key={project.id} 
                  className="project-card"
                  onClick={(e) => {
                    // Não navegar se o clique foi em um botão ou dentro de project-actions
                    if (!e.target.closest('.project-actions') && !e.target.closest('button')) {
                      navigate(`/studio/${project.id}`);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Clique para abrir o projeto"
                >
                  <div className="project-header">
                    <h4>{project.name}</h4>
                    <div className="project-status">
                    &nbsp; 
                      {project.isPublic ? (
                        <span className="status-badge public">Público</span>
                      ) : (
                        <span className="status-badge private">Privado</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="project-details">
                    <div className="detail-item">
                      <span className="detail-label">Duração:</span>
                      <span className="detail-value">{project.duration}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Faixas:</span>
                      <span className="detail-value">{project.tracks}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Colaboradores:</span>
                      <span className="detail-value">{project.collaborators}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Última atualização:</span>
                      <span className="detail-value">{formatDate(project.lastUpdated)}</span>
                    </div>
                  </div>

                  <div className="project-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons-group">
                      <button 
                        className="action-btn"
                        onClick={() => handleShare(project)}
                        title="Compartilhar"
                      >
                        🔗
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => handleExport(project)}
                        title="Exportar Projeto"
                      >
                        📤
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => handleDownloadMP3(project)}
                        title="Baixar MP3"
                      >
                        ⬇️
                      </button>
                    </div>
                    <button 
                      className="btn btn-outline btn-small" 
                      onClick={() => navigate(`/studio/${project.id}`)}
                    >
                      Abrir
                    </button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
