import React, { useState, useRef, useEffect } from 'react';
import './RegionSelector.css';

const RegionSelector = ({ duration, onRegionSelect, selectedRegion, onSeek }) => {
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
    console.log('🖱️ RegionSelector - MouseDown evento capturado!');
    
    // Se clicar com Shift, limpa a seleção
    if (e.shiftKey) {
      console.log('🧹 Shift+Click - Limpando seleção');
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    console.log('🖱️ MouseDown em:', time, 'segundos');
    
    // Store initial position
    mouseDownPositionRef.current = { x: e.clientX, time };
    setHasMoved(false);
    setIsDragging(true);
    setDragStart(time);
    setDragEnd(time);
  };

  // Event listeners are now handled directly in the useEffect below
  
  useEffect(() => {
    if (isDragging) {
      console.log('📌 Adicionando event listeners globais');
      
      const moveHandler = (e) => {
        if (!containerRef.current || !mouseDownPositionRef.current) return;
        
        // Check if mouse moved more than 5 pixels (to differentiate click from drag)
        const deltaX = Math.abs(e.clientX - mouseDownPositionRef.current.x);
        
        if (deltaX > 5 && !hasMoved) {
          console.log('🏃 Movimento detectado - iniciando arrasto');
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
        console.log('🖱️ RegionSelector - MouseUp (global)');
        setIsDragging(false);
      };
      
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      
      return () => {
        console.log('📌 Removendo event listeners globais');
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
    }
  }, [isDragging, duration, hasMoved]);

  // Handle when dragging stops - only runs once when drag ends
  useEffect(() => {
    // Only trigger when isDragging changes from true to false
    if (prevIsDraggingRef.current === true && isDragging === false) {
      console.log('🎯 Mouse solto! hasMoved:', hasMoved);
      
      if (!hasMoved && mouseDownPositionRef.current && onSeek) {
        // It was a click, not a drag - seek to position
        const clickTime = mouseDownPositionRef.current.time;
        console.log('👆 Clique simples detectado - Seeking para:', clickTime);
        onSeek(clickTime);
        // Don't create a region
        setDragStart(null);
        setDragEnd(null);
      } else if (hasMoved && dragStart !== null && dragEnd !== null) {
        // It was a drag - create region
        const start = Math.min(dragStart, dragEnd);
        const end = Math.max(dragStart, dragEnd);
        const regionDuration = end - start;
        
        console.log('🖱️ Arrasto detectado - Criando região:', { start, end, duration: regionDuration });
        
        if (regionDuration > 0.1) {
          console.log('✅ Região válida! Chamando onRegionSelect');
          onRegionSelect({ start, end });
        } else {
          console.log('❌ Região muito pequena:', regionDuration, 's (mínimo 0.1s)');
          // Clear the region if it's too small
          setDragStart(null);
          setDragEnd(null);
        }
      }
      
      // Reset
      mouseDownPositionRef.current = null;
      setHasMoved(false);
    }
    
    // Update ref for next comparison
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
      title="Clique para mover cursor. Arraste para selecionar. Shift+Click para limpar."
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



