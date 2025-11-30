import React, { useState, useEffect } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';
import './CollaboratorsPanel.css';

const CollaboratorsPanel = ({ projectId, isOwner, currentUserRole, onClose }) => {
  const { getCollaborators, addCollaborator, removeCollaborator, updateCollaboratorRole } = useCollaboration();
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('COLLABORATOR');
  const [adding, setAdding] = useState(false);

  // Carregar colaboradores
  useEffect(() => {
    loadCollaborators();
  }, [projectId]);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCollaborators(projectId);
      setCollaborators(response.collaborators || []);
    } catch (err) {
      setError('Erro ao carregar colaboradores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    
    if (!newUserEmail.trim()) {
      setError('Por favor, insira um email');
      return;
    }

    try {
      setAdding(true);
      setError(null);
      await addCollaborator(projectId, newUserEmail.trim(), newUserRole);
      setNewUserEmail('');
      setNewUserRole('COLLABORATOR');
      await loadCollaborators();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao adicionar colaborador');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    if (!window.confirm('Tem certeza que deseja remover este colaborador?')) {
      return;
    }

    try {
      setError(null);
      await removeCollaborator(projectId, collaboratorId);
      await loadCollaborators();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover colaborador');
    }
  };

  const handleUpdateRole = async (collaboratorId, newRole) => {
    try {
      setError(null);
      await updateCollaboratorRole(projectId, collaboratorId, newRole);
      await loadCollaborators();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar role');
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      OWNER: 'Proprietário',
      ADMIN: 'Administrador',
      COLLABORATOR: 'Colaborador',
      VIEWER: 'Visualizador'
    };
    return labels[role] || role;
  };

  return (
    <div className="collaborators-panel-overlay" onClick={onClose}>
      <div className="collaborators-panel" onClick={(e) => e.stopPropagation()}>
        <div className="collaborators-panel-header">
          <h2>Gerenciar Colaboradores</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {(isOwner || currentUserRole === 'ADMIN') && (
          <form className="add-collaborator-form" onSubmit={handleAddCollaborator}>
            <h3>Adicionar Colaborador</h3>
            <div className="form-row">
              <input
                type="email"
                placeholder="Email do usuário"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                disabled={adding}
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                disabled={adding}
              >
                <option value="COLLABORATOR">Colaborador</option>
                <option value="ADMIN">Administrador</option>
                <option value="VIEWER">Visualizador</option>
              </select>
              <button type="submit" disabled={adding}>
                {adding ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        )}

        <div className="collaborators-list">
          <h3>Colaboradores ({collaborators.length})</h3>
          
          {loading ? (
            <div className="loading">Carregando...</div>
          ) : collaborators.length === 0 ? (
            <div className="empty-state">Nenhum colaborador ainda</div>
          ) : (
            <ul>
              {collaborators.map((collab) => (
                <li key={collab.id} className="collaborator-item">
                  <div className="collaborator-info">
                    <div className="collaborator-avatar">
                      <div className="avatar-placeholder">
                        {collab.user.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="collaborator-details">
                      <div className="collaborator-name">{collab.user.name}</div>
                      <div className="collaborator-email">{collab.user.email}</div>
                    </div>
                  </div>

                  <div className="collaborator-actions">
                    {(isOwner || currentUserRole === 'ADMIN') && collab.role !== 'OWNER' ? (
                      <>
                        <select
                          value={collab.role}
                          onChange={(e) => handleUpdateRole(collab.id, e.target.value)}
                          className="role-select"
                        >
                          <option value="COLLABORATOR">Colaborador</option>
                          <option value="ADMIN">Administrador</option>
                          <option value="VIEWER">Visualizador</option>
                        </select>
                        <button
                          className="remove-btn"
                          onClick={() => handleRemoveCollaborator(collab.id)}
                          title="Remover colaborador"
                        >
                          🗑️
                        </button>
                      </>
                    ) : (
                      <span className="role-badge">{getRoleLabel(collab.role)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorsPanel;

