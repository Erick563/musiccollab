import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoadingSpinner.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/auth';
    return null;
  }

  return children;
};

export default ProtectedRoute;
