import React, { useEffect, useRef, useState, useMemo } from 'react';
import './WaveformDisplay.css';

const WaveformDisplay = ({ audioUrl, color, height = 80, isPlaying = false, trimStart = null, trimEnd = null, deletedRegions }) => {
  const canvasRef = useRef(null);
  const [waveformData, setWaveformData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const deletedRegionsKey = useMemo(() => {
    return deletedRegions 
      ? deletedRegions.map(r => `${r.start}-${r.end}`).join(',')
      : '';
  }, [deletedRegions]);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const rawData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const totalDuration = audioBuffer.duration;
        
        const actualTrimStart = trimStart || 0;
        const actualTrimEnd = trimEnd || totalDuration;
        const startSample = Math.floor(actualTrimStart * sampleRate);
        const endSample = Math.floor(actualTrimEnd * sampleRate);
        const segmentData = rawData.slice(startSample, endSample);
        
        let dataToUse;
        
        if (deletedRegions && deletedRegions.length > 0) {
          const sortedRegions = [...deletedRegions].sort((a, b) => a.start - b.start);
          
          const relevantRegions = sortedRegions.filter(region => 
            region.end > actualTrimStart && region.start < actualTrimEnd
          );
          
          const parts = [];
          let currentPos = actualTrimStart;
          
          for (const region of relevantRegions) {
            const regionStart = Math.max(region.start, actualTrimStart);
            const regionEnd = Math.min(region.end, actualTrimEnd);
            
            if (regionStart > currentPos) {
              const partStart = Math.floor((currentPos - actualTrimStart) * sampleRate);
              const partEnd = Math.floor((regionStart - actualTrimStart) * sampleRate);
              const part = segmentData.slice(partStart, partEnd);
              parts.push(part);
            }
            currentPos = regionEnd;
          }
          
          if (currentPos < actualTrimEnd) {
            const partStart = Math.floor((currentPos - actualTrimStart) * sampleRate);
            const part = segmentData.slice(partStart);
            parts.push(part);
          }
          
          const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
          dataToUse = new Float32Array(totalLength);
          let offset = 0;
          for (const part of parts) {
            dataToUse.set(part, offset);
            offset += part.length;
          }
        } else {
          dataToUse = segmentData;
        }
        
        const samples = 1000;
        const blockSize = Math.floor(dataToUse.length / samples);
        const filteredData = [];
        
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            const index = blockStart + j;
            if (index < dataToUse.length) {
              sum += Math.abs(dataToUse[index]);
            }
          }
          filteredData.push(sum / blockSize);
        }
        
        const multiplier = Math.pow(Math.max(...filteredData), -1);
        const normalizedData = filteredData.map(n => n * multiplier);
        
        setWaveformData(normalizedData);
        setIsLoading(false);
        
        audioContext.close();
      } catch (error) {
        setIsLoading(false);
      }
    };
    
    if (audioUrl) {
      loadAudio();
    }
  }, [audioUrl, trimStart, trimEnd, deletedRegionsKey]);

  useEffect(() => {
    if (!waveformData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const barWidth = rect.width / waveformData.length;
    const centerY = rect.height / 2;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, color + 'ff');
    gradient.addColorStop(0.5, color + 'ff');
    gradient.addColorStop(1, color + 'ff');
    
    ctx.fillStyle = gradient;
    
    waveformData.forEach((value, i) => {
      const x = i * barWidth;
      const barHeight = value * (rect.height / 2) * 0.9;
      
      ctx.fillRect(x, centerY - barHeight, barWidth - 0.5, barHeight);
      
      ctx.fillRect(x, centerY, barWidth - 0.5, barHeight);
    });
    
    ctx.strokeStyle = color + '88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(rect.width, centerY);
    ctx.stroke();
    
  }, [waveformData, color, height]);

  return (
    <div className="waveform-display">
      {isLoading ? (
        <div className="waveform-loading">
          <div className="loading-spinner"></div>
          <span>Gerando forma de onda...</span>
        </div>
      ) : (
        <canvas 
          ref={canvasRef} 
          className={`waveform-canvas ${isPlaying ? 'playing' : ''}`}
          style={{ height: `${height}px` }}
        />
      )}
    </div>
  );
};

export default WaveformDisplay;

