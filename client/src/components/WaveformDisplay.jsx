import React, { useEffect, useRef, useState } from 'react';
import './WaveformDisplay.css';

const WaveformDisplay = ({ audioUrl, color, height = 80, isPlaying = false, trimStart = null, trimEnd = null }) => {
  const canvasRef = useRef(null);
  const [waveformData, setWaveformData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
        
        // If trimStart/trimEnd are provided, extract only that segment
        let dataToUse = rawData;
        if (trimStart !== null && trimEnd !== null) {
          const startSample = Math.floor(trimStart * sampleRate);
          const endSample = Math.floor(trimEnd * sampleRate);
          dataToUse = rawData.slice(startSample, endSample);
          console.log('   ✂️ Extraindo segmento:', startSample, 'a', endSample, 'samples');
          console.log('   📏 Segmento tem', dataToUse.length, 'samples');
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
  }, [audioUrl, trimStart, trimEnd]);

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

