import React, { useState, useRef, useEffect } from 'react';
import './RegionSelector.css';

const RegionSelector = ({ duration, onRegionSelect, selectedRegion, onSeek, isReadOnly = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [hasMoved, setHasMoved] = useState(false);
  const containerRef = useRef(null);
  const prevIsDraggingRef = useRef(false);
  const mouseDownPositionRef = useRef(null);

  useEffect(() => {
    if (selectedRegion) {
      setDragStart(selectedRegion.start);
      setDragEnd(selectedRegion.end);
    }
  }, [selectedRegion]);

  const handleMouseDown = (e) => {
    // Se estiver em modo somente leitura, não fazer nada
    if (isReadOnly) {
      return;
    }

    if (e.shiftKey) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    mouseDownPositionRef.current = { x: e.clientX, time };
    setHasMoved(false);
    setIsDragging(true);
    setDragStart(time);
    setDragEnd(time);
  };

  useEffect(() => {
    if (isDragging) {
      const moveHandler = (e) => {
        if (!containerRef.current || !mouseDownPositionRef.current) return;
        
        const deltaX = Math.abs(e.clientX - mouseDownPositionRef.current.x);
        
        if (deltaX > 5 && !hasMoved) {
          setHasMoved(true);
        }
        
        if (hasMoved || deltaX > 5) {
          const rect = containerRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = Math.max(0, Math.min(1, x / rect.width));
          const time = percentage * duration;
          
          setDragEnd(time);
        }
      };
      
      const upHandler = () => {
        setIsDragging(false);
      };
      
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      
      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
    }
  }, [isDragging, duration, hasMoved]);

  useEffect(() => {
    if (prevIsDraggingRef.current === true && isDragging === false) {
      if (!hasMoved && mouseDownPositionRef.current && onSeek) {
        const clickTime = mouseDownPositionRef.current.time;
        onSeek(clickTime);
        setDragStart(null);
        setDragEnd(null);
      } else if (hasMoved && dragStart !== null && dragEnd !== null) {
        const start = Math.min(dragStart, dragEnd);
        const end = Math.max(dragStart, dragEnd);
        const regionDuration = end - start;
        
        if (regionDuration > 0.1) {
          onRegionSelect({ start, end });
        } else {
          setDragStart(null);
          setDragEnd(null);
        }
      }
      
      mouseDownPositionRef.current = null;
      setHasMoved(false);
    }
    
    prevIsDraggingRef.current = isDragging;
  }, [isDragging, hasMoved, dragStart, dragEnd, onSeek, onRegionSelect]);

  const getRegionStyle = () => {
    if (!dragStart || !dragEnd || !duration) return {};
    
    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);
    
    return {
      left: `${(start / duration) * 100}%`,
      width: `${((end - start) / duration) * 100}%`
    };
  };

  return (
    <div 
      ref={containerRef}
      className="region-selector"
      onMouseDown={handleMouseDown}
      title={isReadOnly ? "Modo somente visualização" : "Clique para mover cursor. Arraste para selecionar. Shift+Click para limpar."}
      style={isReadOnly ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
    >
      {(dragStart !== null && dragEnd !== null) && (
        <div className="selected-region" style={getRegionStyle()}>
          <div className="region-handle region-handle-start" />
          <div className="region-handle region-handle-end" />
        </div>
      )}
    </div>
  );
};

export default RegionSelector;



