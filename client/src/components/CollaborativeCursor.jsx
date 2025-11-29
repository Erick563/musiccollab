import React from 'react';
import './CollaborativeCursor.css';

const CollaborativeCursor = ({ user, containerRef }) => {
  if (!user.mousePosition || !containerRef.current) {
    return null;
  }

  const { x, y } = user.mousePosition;

  return (
    <div
      className="collaborative-cursor"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: 10000,
        transform: 'translate(-2px, -2px)'
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        style={{
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))'
        }}
      >
        <path
          d="M8 4L8 24L13 19L16 27L19 26L16 18L22 18L8 4Z"
          fill={user.cursorColor || '#FF6B6B'}
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Badge com nome */}
      <div
        className="cursor-label"
        style={{
          backgroundColor: user.cursorColor || '#FF6B6B',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          marginLeft: '28px',
          marginTop: '0px',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
          border: '2px solid white',
          letterSpacing: '0.3px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {user.userName}
      </div>
    </div>
  );
};

export default CollaborativeCursor;

