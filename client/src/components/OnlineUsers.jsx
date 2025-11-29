import React from 'react';
import './OnlineUsers.css';

const OnlineUsers = ({ users }) => {
  return (
    <div className="online-users-container">
      <div className="online-users-header">
        <span className="online-indicator">🟢</span>
        <span className="online-count">{users.length} Online</span>
      </div>
      <div className="online-users-list">
        {users.map((user) => (
          <div key={user.socketId} className="online-user-item" title={user.userName}>
            <div className="user-avatar">
              <div className="avatar-placeholder">
                {user.userName.charAt(0).toUpperCase()}
              </div>
              {user.isEditing && (
                <div className="editing-indicator" title="Editando">✏️</div>
              )}
            </div>
            <div className="user-name">{user.userName}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnlineUsers;

