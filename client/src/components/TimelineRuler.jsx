import React from 'react';
import './TimelineRuler.css';

const TimelineRuler = ({ duration }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeMarkers = () => {
    if (duration === 0) return [];
    
    const markers = [];
    let interval = 10;
    
    if (duration > 300) interval = 60;
    else if (duration > 120) interval = 30;
    else if (duration > 60) interval = 15;
    else if (duration > 30) interval = 10;
    else interval = 5;
    
    for (let time = 0; time <= duration; time += interval) {
      markers.push({
        time,
        position: (time / duration) * 100
      });
    }
    
    if (markers[markers.length - 1].time < duration) {
      markers.push({
        time: duration,
        position: 100
      });
    }
    
    return markers;
  };

  const markers = getTimeMarkers();

  return (
    <div className="timeline-ruler">
      <div className="ruler-spacer" style={{ width: '250px' }} />
      <div className="ruler-track">
        {markers.map((marker, index) => (
          <div 
            key={index}
            className="ruler-marker"
            style={{ left: `${marker.position}%` }}
          >
            <div className="marker-line" />
            <div className="marker-label">{formatTime(marker.time)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineRuler;



