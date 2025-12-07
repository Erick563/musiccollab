import React, { useState, useEffect } from 'react';
import './CollaborativeCursor.css';

const CollaborativeCursor = ({ user, containerRef }) => {
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!user.mousePosition || !containerRef.current) {
      return;
    }

    const updatePosition = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const { x, y } = user.mousePosition;

      // Converter porcentagem para pixels usando as dimensões reais do container
      const leftPx = (x / 100) * rect.width;
      const topPx = (y / 100) * rect.height;

      setPosition({
        left: leftPx,
        top: topPx
      });
    };

    updatePosition();

    // Atualizar posição quando houver resize ou scroll
    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    
    // Observer para mudanças no container (zoom, etc.)
    const resizeObserver = new ResizeObserver(updatePosition);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [user.mousePosition, containerRef]);

  if (!user.mousePosition || !containerRef.current) {
    return null;
  }

  return (
    <div
      className="collaborative-cursor"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
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

