import React, { useState } from 'react';
import './EffectsPanel.css';

const EffectsPanel = ({ track, onUpdateEffects }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [effects, setEffects] = useState({
    reverb: { enabled: false, roomSize: 50, damping: 50, wet: 30 },
    delay: { enabled: false, time: 500, feedback: 40, wet: 30 },
    eq: { 
      enabled: false, 
      low: 0, 
      mid: 0, 
      high: 0,
      lowFreq: 250,
      midFreq: 1000,
      highFreq: 4000
    },
    compressor: { enabled: false, threshold: -24, ratio: 4, attack: 3, release: 250 }
  });

  const handleEffectToggle = (effectName) => {
    const updated = {
      ...effects,
      [effectName]: {
        ...effects[effectName],
        enabled: !effects[effectName].enabled
      }
    };
    setEffects(updated);
    onUpdateEffects(track.id, updated);
  };

  const handleParameterChange = (effectName, parameter, value) => {
    const updated = {
      ...effects,
      [effectName]: {
        ...effects[effectName],
        [parameter]: parseFloat(value)
      }
    };
    setEffects(updated);
    onUpdateEffects(track.id, updated);
  };

  return (
    <div className="effects-panel">
      <button 
        className={`effects-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Efeitos"
      >
        🎛️ FX
      </button>

      {isOpen && (
        <div className="effects-dropdown">
          {/* Reverb */}
          <div className="effect-section">
            <div className="effect-header">
              <label className="effect-checkbox">
                <input 
                  type="checkbox" 
                  checked={effects.reverb.enabled}
                  onChange={() => handleEffectToggle('reverb')}
                />
                <span>Reverb</span>
              </label>
            </div>
            {effects.reverb.enabled && (
              <div className="effect-controls">
                <div className="effect-control">
                  <label>Room Size</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={effects.reverb.roomSize}
                    onChange={(e) => handleParameterChange('reverb', 'roomSize', e.target.value)}
                  />
                  <span>{effects.reverb.roomSize}%</span>
                </div>
                <div className="effect-control">
                  <label>Damping</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={effects.reverb.damping}
                    onChange={(e) => handleParameterChange('reverb', 'damping', e.target.value)}
                  />
                  <span>{effects.reverb.damping}%</span>
                </div>
                <div className="effect-control">
                  <label>Wet</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={effects.reverb.wet}
                    onChange={(e) => handleParameterChange('reverb', 'wet', e.target.value)}
                  />
                  <span>{effects.reverb.wet}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Delay */}
          <div className="effect-section">
            <div className="effect-header">
              <label className="effect-checkbox">
                <input 
                  type="checkbox" 
                  checked={effects.delay.enabled}
                  onChange={() => handleEffectToggle('delay')}
                />
                <span>Delay</span>
              </label>
            </div>
            {effects.delay.enabled && (
              <div className="effect-controls">
                <div className="effect-control">
                  <label>Time</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="2000" 
                    value={effects.delay.time}
                    onChange={(e) => handleParameterChange('delay', 'time', e.target.value)}
                  />
                  <span>{effects.delay.time}ms</span>
                </div>
                <div className="effect-control">
                  <label>Feedback</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={effects.delay.feedback}
                    onChange={(e) => handleParameterChange('delay', 'feedback', e.target.value)}
                  />
                  <span>{effects.delay.feedback}%</span>
                </div>
                <div className="effect-control">
                  <label>Wet</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={effects.delay.wet}
                    onChange={(e) => handleParameterChange('delay', 'wet', e.target.value)}
                  />
                  <span>{effects.delay.wet}%</span>
                </div>
              </div>
            )}
          </div>

          {/* EQ */}
          <div className="effect-section">
            <div className="effect-header">
              <label className="effect-checkbox">
                <input 
                  type="checkbox" 
                  checked={effects.eq.enabled}
                    onChange={() => handleEffectToggle('eq')}
                />
                <span>EQ (3-Band)</span>
              </label>
            </div>
            {effects.eq.enabled && (
              <div className="effect-controls">
                <div className="effect-control">
                  <label>Low ({effects.eq.lowFreq}Hz)</label>
                  <input 
                    type="range" 
                    min="-12" 
                    max="12" 
                    step="0.5"
                    value={effects.eq.low}
                    onChange={(e) => handleParameterChange('eq', 'low', e.target.value)}
                  />
                  <span>{effects.eq.low > 0 ? '+' : ''}{effects.eq.low}dB</span>
                </div>
                <div className="effect-control">
                  <label>Mid ({effects.eq.midFreq}Hz)</label>
                  <input 
                    type="range" 
                    min="-12" 
                    max="12" 
                    step="0.5"
                    value={effects.eq.mid}
                    onChange={(e) => handleParameterChange('eq', 'mid', e.target.value)}
                  />
                  <span>{effects.eq.mid > 0 ? '+' : ''}{effects.eq.mid}dB</span>
                </div>
                <div className="effect-control">
                  <label>High ({effects.eq.highFreq}Hz)</label>
                  <input 
                    type="range" 
                    min="-12" 
                    max="12" 
                    step="0.5"
                    value={effects.eq.high}
                    onChange={(e) => handleParameterChange('eq', 'high', e.target.value)}
                  />
                  <span>{effects.eq.high > 0 ? '+' : ''}{effects.eq.high}dB</span>
                </div>
              </div>
            )}
          </div>

          {/* Compressor */}
          <div className="effect-section">
            <div className="effect-header">
              <label className="effect-checkbox">
                <input 
                  type="checkbox" 
                  checked={effects.compressor.enabled}
                  onChange={() => handleEffectToggle('compressor')}
                />
                <span>Compressor</span>
              </label>
            </div>
            {effects.compressor.enabled && (
              <div className="effect-controls">
                <div className="effect-control">
                  <label>Threshold</label>
                  <input 
                    type="range" 
                    min="-60" 
                    max="0" 
                    value={effects.compressor.threshold}
                    onChange={(e) => handleParameterChange('compressor', 'threshold', e.target.value)}
                  />
                  <span>{effects.compressor.threshold}dB</span>
                </div>
                <div className="effect-control">
                  <label>Ratio</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    step="0.5"
                    value={effects.compressor.ratio}
                    onChange={(e) => handleParameterChange('compressor', 'ratio', e.target.value)}
                  />
                  <span>{effects.compressor.ratio}:1</span>
                </div>
                <div className="effect-control">
                  <label>Attack</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={effects.compressor.attack}
                    onChange={(e) => handleParameterChange('compressor', 'attack', e.target.value)}
                  />
                  <span>{effects.compressor.attack}ms</span>
                </div>
                <div className="effect-control">
                  <label>Release</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="1000" 
                    value={effects.compressor.release}
                    onChange={(e) => handleParameterChange('compressor', 'release', e.target.value)}
                  />
                  <span>{effects.compressor.release}ms</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;



