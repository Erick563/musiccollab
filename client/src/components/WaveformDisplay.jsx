import React, { useEffect, useRef, useState, useMemo } from 'react';
import './WaveformDisplay.css';

const WaveformDisplay = ({ audioUrl, color, height = 80, isPlaying = false, trimStart = null, trimEnd = null, deletedRegions }) => {
  const canvasRef = useRef(null);
  const [waveformData, setWaveformData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create a stable key for deletedRegions to avoid unnecessary reloads
  const deletedRegionsKey = useMemo(() => {
    return deletedRegions 
      ? deletedRegions.map(r => `${r.start}-${r.end}`).join(',')
      : '';
  }, [deletedRegions]);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        setIsLoading(true);
        
        // Fetch audio file
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Get audio data from first channel
        const rawData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const totalDuration = audioBuffer.duration;
        
        console.log('🌊 WaveformDisplay - Gerando forma de onda');
        console.log('   Total duration:', totalDuration);
        console.log('   trimStart:', trimStart, 'trimEnd:', trimEnd);
        console.log('   deletedRegions:', deletedRegions);
        
        // Extract the segment based on trimStart/trimEnd
        const actualTrimStart = trimStart || 0;
        const actualTrimEnd = trimEnd || totalDuration;
        const startSample = Math.floor(actualTrimStart * sampleRate);
        const endSample = Math.floor(actualTrimEnd * sampleRate);
        const segmentData = rawData.slice(startSample, endSample);
        
        console.log('   ✂️ Extraindo segmento:', startSample, 'a', endSample, 'samples');
        
        // Now, remove deleted regions from this segment
        let dataToUse;
        
        if (deletedRegions && deletedRegions.length > 0) {
          // Sort deleted regions by start time
          const sortedRegions = [...deletedRegions].sort((a, b) => a.start - b.start);
          
          // Filter only regions that overlap with our segment [actualTrimStart, actualTrimEnd]
          const relevantRegions = sortedRegions.filter(region => 
            region.end > actualTrimStart && region.start < actualTrimEnd
          );
          
          // Extract non-deleted parts and concatenate them
          const parts = [];
          let currentPos = actualTrimStart;
          
          for (const region of relevantRegions) {
            // Clamp region to segment bounds
            const regionStart = Math.max(region.start, actualTrimStart);
            const regionEnd = Math.min(region.end, actualTrimEnd);
            
            // Add the part before this deleted region
            if (regionStart > currentPos) {
              const partStart = Math.floor((currentPos - actualTrimStart) * sampleRate);
              const partEnd = Math.floor((regionStart - actualTrimStart) * sampleRate);
              const part = segmentData.slice(partStart, partEnd);
              parts.push(part);
              console.log(`   📦 Parte não deletada: ${currentPos}s a ${regionStart}s (${part.length} samples)`);
            }
            // Skip the deleted region
            currentPos = regionEnd;
          }
          
          // Add the remaining part after all deleted regions
          if (currentPos < actualTrimEnd) {
            const partStart = Math.floor((currentPos - actualTrimStart) * sampleRate);
            const part = segmentData.slice(partStart);
            parts.push(part);
            console.log(`   📦 Parte final: ${currentPos}s a ${actualTrimEnd}s (${part.length} samples)`);
          }
          
          // Concatenate all parts
          const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
          dataToUse = new Float32Array(totalLength);
          let offset = 0;
          for (const part of parts) {
            dataToUse.set(part, offset);
            offset += part.length;
          }
          
          console.log('   ✅ Dados concatenados (sem regiões deletadas):', dataToUse.length, 'samples');
        } else {
          // No deleted regions, use the segment as is
          dataToUse = segmentData;
          console.log('   📏 Sem regiões deletadas - usando segmento completo:', dataToUse.length, 'samples');
        }
        
        // Sample the data to match canvas width
        const samples = 1000; // Number of samples to display
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
        
        // Normalize the data
        const multiplier = Math.pow(Math.max(...filteredData), -1);
        const normalizedData = filteredData.map(n => n * multiplier);
        
        console.log('   ✅ Forma de onda gerada com', normalizedData.length, 'pontos');
        
        setWaveformData(normalizedData);
        setIsLoading(false);
        
        // Close audio context
        audioContext.close();
      } catch (error) {
        console.error('Error loading waveform:', error);
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
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw waveform
    const barWidth = rect.width / waveformData.length;
    const centerY = rect.height / 2;
    
    // Create gradient with more opacity/contrast
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, color + 'ff');
    gradient.addColorStop(0.5, color + 'ff');
    gradient.addColorStop(1, color + 'ff');
    
    ctx.fillStyle = gradient;
    
    // Draw each bar directly from waveformData (already has deleted regions removed)
    waveformData.forEach((value, i) => {
      const x = i * barWidth;
      const barHeight = value * (rect.height / 2) * 0.9;
      
      // Draw upper half
      ctx.fillRect(x, centerY - barHeight, barWidth - 0.5, barHeight);
      
      // Draw lower half
      ctx.fillRect(x, centerY, barWidth - 0.5, barHeight);
    });
    
    // Draw center line (more visible)
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

