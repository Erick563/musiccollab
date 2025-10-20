import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTracks: 0,
    longestProject: null,
    popularProjects: []
  });

  // Mock data - em produção, estes dados viriam de uma API
  useEffect(() => {
    // Simular carregamento de dados
    const mockProjects = [
      {
        id: 1,
        name: 'Projeto Eletrônico',
        duration: '4:32',
        lastUpdated: '2024-10-01T10:30:00Z',
        tracks: 8,
        collaborators: 3,
        isPublic: true,
        popularity: 95
      },
      {
        id: 2,
        name: 'Rock Alternativo',
        duration: '3:45',
        lastUpdated: '2024-09-28T15:20:00Z',
        tracks: 12,
        collaborators: 2,
        isPublic: false,
        popularity: 87
      },
      {
        id: 3,
        name: 'Ambient Chill',
        duration: '6:18',
        lastUpdated: '2024-09-25T09:15:00Z',
        tracks: 6,
        collaborators: 1,
        isPublic: true,
        popularity: 92
      },
      {
        id: 4,
        name: 'Hip Hop Beat',
        duration: '2:58',
        lastUpdated: '2024-09-30T14:45:00Z',
        tracks: 10,
        collaborators: 4,
        isPublic: true,
        popularity: 98
      }
    ];

    const mockTracks = [
      { id: 1, name: 'Bass Line', projectId: 1, duration: '4:32', type: 'bass' },
      { id: 2, name: 'Lead Synth', projectId: 1, duration: '4:32', type: 'synth' },
      { id: 3, name: 'Drums', projectId: 2, duration: '3:45', type: 'drums' },
      { id: 4, name: 'Guitar', projectId: 2, duration: '3:45', type: 'guitar' },
      { id: 5, name: 'Ambient Pad', projectId: 3, duration: '6:18', type: 'pad' },
      { id: 6, name: 'Beat', projectId: 4, duration: '2:58', type: 'drums' }
    ];

    setProjects(mockProjects);
    setTracks(mockTracks);
    setCurrentProject(mockProjects[0]);

    // Calcular estatísticas
    const longestProject = mockProjects.reduce((prev, current) => 
      (prev.duration > current.duration) ? prev : current
    );

    const popularProjects = mockProjects
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 3);

    setStats({
      totalProjects: mockProjects.length,
      totalTracks: mockTracks.length,
      longestProject,
      popularProjects
    });
  }, []);

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
        url: `${window.location.origin}/project/${project.id}`
      });
    } else {
      // Fallback para navegadores que não suportam Web Share API
      const url = `${window.location.origin}/project/${project.id}`;
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
              <div className="stat-card current-project">
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <h3>{currentProject?.name || 'Nenhum'}</h3>
                  <p>Projeto Atual</p>
                </div>
              </div>
            </div>
          </section>

          {/* Projetos Mais Famosos */}
          <section className="popular-projects-section">
            <h3>Projetos Mais Famosos</h3>
            <div className="popular-projects-grid">
              {stats.popularProjects.map((project, index) => (
                <div key={project.id} className="popular-project-card">
                  <div className="popularity-rank">#{index + 1}</div>
                  <div className="project-info">
                    <h4>{project.name}</h4>
                    <p>{project.popularity}% de popularidade</p>
                    <p>{project.collaborators} colaboradores</p>
                  </div>
                  <div className="popularity-bar">
                    <div 
                      className="popularity-fill" 
                      style={{ width: `${project.popularity}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Lista de Projetos */}
          <section className="projects-section">
            <div className="section-header">
              <h3>Meus Projetos</h3>
              <button className="btn btn-primary" onClick={() => navigate('/studio')}>
                <span className="btn-icon">➕</span>
                Novo Projeto
              </button>
            </div>
            
            <div className="projects-grid">
              {projects.map(project => (
                <div key={project.id} className="project-card">
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

                  <div className="project-actions">
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
                    <button className="btn btn-outline btn-small" onClick={() => navigate('/studio')}>
                      Abrir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Lista de Faixas */}
          <section className="tracks-section">
            <h3>Minhas Faixas</h3>
            <div className="tracks-list">
              {tracks.map(track => {
                const project = projects.find(p => p.id === track.projectId);
                return (
                  <div key={track.id} className="track-item">
                    <div className="track-icon">
                      {track.type === 'drums' && '🥁'}
                      {track.type === 'bass' && '🎸'}
                      {track.type === 'synth' && '🎹'}
                      {track.type === 'guitar' && '🎸'}
                      {track.type === 'pad' && '🎵'}
                    </div>
                    <div className="track-info">
                      <h4>{track.name}</h4>
                      <p>Projeto: {project?.name}</p>
                    </div>
                    <div className="track-duration">
                      {track.duration}
                    </div>
                    <div className="track-actions">
                      <button className="action-btn" title="Reproduzir">▶️</button>
                      <button className="action-btn" title="Baixar">⬇️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
