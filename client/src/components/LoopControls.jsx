import React from 'react';
import './LoopControls.css';

const LoopControls = ({ 
  loopEnabled, 
  loopStart, 
  loopEnd, 
  duration,
  onToggleLoop, 
  onSetLoopStart, 
  onSetLoopEnd,
  currentTime 
}) => {
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetLoopStart = () => {
    onSetLoopStart(currentTime);
  };

  const handleSetLoopEnd = () => {
    onSetLoopEnd(currentTime);
  };

  const handleClearLoop = () => {
    onToggleLoop(false);
  };

  return (
    <div className={`loop-controls ${loopEnabled ? 'active' : ''}`}>
      <button 
        className={`loop-toggle-btn ${loopEnabled ? 'active' : ''}`}
        onClick={() => onToggleLoop(!loopEnabled)}
        title="Toggle Loop"
      >
        🔁 Loop
      </button>

      {loopEnabled && (
        <div className="loop-settings">
          <div className="loop-points">
            <div className="loop-point">
              <label>Start</label>
              <span className="loop-time">{formatTime(loopStart)}</span>
              <button 
                onClick={handleSetLoopStart}
                title="Set Loop Start"
                className="set-point-btn"
              >
                ⏮
              </button>
            </div>
            
            <div className="loop-point">
              <label>End</label>
              <span className="loop-time">{formatTime(loopEnd)}</span>
              <button 
                onClick={handleSetLoopEnd}
                title="Set Loop End"
                className="set-point-btn"
              >
                ⏭
              </button>
            </div>
          </div>

          <button 
            className="clear-loop-btn"
            onClick={handleClearLoop}
            title="Clear Loop"
          >
            Clear
          </button>
        </div>
      )}

      {/* Loop Region Visualizer */}
      {loopEnabled && duration > 0 && (
        <div className="loop-region-visualizer">
          <div 
            className="loop-region"
            style={{
              left: `${(loopStart / duration) * 100}%`,
              width: `${((loopEnd - loopStart) / duration) * 100}%`
            }}
          >
            <div className="loop-marker loop-start">⏮</div>
            <div className="loop-marker loop-end">⏭</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoopControls;



