import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './HomePage.css';

const HomePage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <h1>🎵 MusicCollab</h1>
            </div>
            <nav className="nav">
              {user ? (
                <div className="user-menu">
                  <span className="user-name">Olá, {user.name}!</span>
                  <a href="/dashboard" className="btn btn-primary">Dashboard</a>
                  <button className="logout-btn" onClick={logout}>
                    Sair
                  </button>
                </div>
              ) : (
                <div className="auth-buttons">
                  <a href="/auth?mode=login" className="btn btn-outline">Entrar</a>
                  <a href="/auth?mode=register" className="btn btn-primary">Criar conta</a>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="home-main">
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h2>Produção Musical Colaborativa em Tempo Real</h2>
              <p>
                Crie, edite e compartilhe projetos musicais com outros produtores 
                ao redor do mundo. Colaboração instantânea, qualidade profissional.
              </p>
              {!user && (
                <div className="hero-buttons">
                  <a href="/auth?mode=register" className="btn btn-primary btn-large">
                    Começar Agora
                  </a>
                  <a href="#features" className="btn btn-outline btn-large">
                    Saiba Mais
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="features" className="features">
          <div className="container">
            <h3>Recursos Principais</h3>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🎧</div>
                <h4>Edição em Tempo Real</h4>
                <p>
                  Colabore simultaneamente com outros produtores. 
                  Veja mudanças instantaneamente enquanto trabalha.
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🎵</div>
                <h4>Múltiplas Faixas</h4>
                <p>
                  Organize seu projeto com várias faixas de áudio. 
                  Mixagem profissional com controles avançados.
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">👥</div>
                <h4>Compartilhamento</h4>
                <p>
                  Convide outros músicos para seus projetos. 
                  Controle de permissões e acesso seguro.
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📤</div>
                <h4>Exportação</h4>
                <p>
                  Exporte suas criações em múltiplos formatos. 
                  Qualidade profissional para distribuição.
                </p>
              </div>
            </div>
          </div>
        </section>

        {user && (
          <section className="dashboard-preview">
            <div className="container">
              <h3>Seus Projetos</h3>
              <div className="projects-grid">
                <div className="project-card">
                  <div className="project-info">
                    <h4>Novo Projeto</h4>
                    <p>Crie um novo projeto musical</p>
                  </div>
                  <a href="/studio" className="btn btn-primary">Criar</a>
                </div>
                
                <div className="project-card">
                  <div className="project-info">
                    <h4>Projeto Demo</h4>
                    <p>Última modificação: há 2 dias</p>
                  </div>
                  <a href="/studio" className="btn btn-outline">Abrir</a>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="home-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>MusicCollab</h4>
              <p>Plataforma de produção musical colaborativa</p>
            </div>
            <div className="footer-section">
              <h4>Recursos</h4>
              <ul>
                <li><a href="#features">Recursos</a></li>
                <li><a href="#pricing">Preços</a></li>
                <li><a href="#support">Suporte</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contato</h4>
              <p>contato@musiccollab.com</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 MusicCollab. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
