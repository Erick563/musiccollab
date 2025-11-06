import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import StudioPage from './pages/StudioPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Componente para redirecionar de /project/:id para /studio/:id
const ProjectRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/studio/${id}`} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/studio/:id?" 
              element={
                <ProtectedRoute>
                  <StudioPage />
                </ProtectedRoute>
              } 
            />
            {/* Redirecionamento para compatibilidade com links compartilhados */}
            <Route 
              path="/project/:id" 
              element={<ProjectRedirect />} 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
