import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AuthForms.css';

const RegisterForm = ({ onToggleMode }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register, error } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword)
      return;

    setIsLoading(true);

    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);
    
    setIsLoading(false);
    
    if (result.success)
      window.location.href = '/dashboard';

  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <div className="auth-header">
          <h2>Criar Conta</h2>
          <p>Junte-se à comunidade de produtores musicais</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nome completo</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Seu nome completo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="seu@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Mínimo 6 caracteres"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar senha</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Digite a senha novamente"
            />
            {formData.password && formData.confirmPassword && 
             formData.password !== formData.confirmPassword && (
              <span className="error-text">As senhas não coincidem</span>
            )}
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading || formData.password !== formData.confirmPassword}
          >
            {isLoading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="auth-footer">
          <button 
            type="button" 
            className="back-home-button"
            onClick={() => navigate('/')}
          >
            ← Voltar à Home
          </button>
          <p>
            Já tem uma conta?{' '}
            <button 
              type="button" 
              className="link-button"
              onClick={onToggleMode}
            >
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
