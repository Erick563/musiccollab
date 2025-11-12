import React from 'react';
import './UserCursors.css';

const UserCursors = ({ users, duration, zoom = 1 }) => {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#a29bfe', '#fd79a8'];
  
  // Atribuir cores consistentes aos usuários
  const getUserColor = (userId) => {
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div className="user-cursors-container">
      {users.map((user) => {
        if (user.cursorPosition === undefined || user.cursorPosition === null) {
          return null;
        }

        const position = (user.cursorPosition / duration) * 100;
        const color = getUserColor(user.userId);

        return (
          <div
            key={user.socketId}
            className="user-cursor"
            style={{
              left: `${position}%`,
              borderColor: color
            }}
          >
            <div className="cursor-line" style={{ borderColor: color }}></div>
            <div className="cursor-label" style={{ backgroundColor: color }}>
              {user.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserCursors;

