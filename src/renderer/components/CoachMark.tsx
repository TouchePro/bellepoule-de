/**
 * BellePoule Modern - CoachMark Component
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useRef } from 'react';

interface CoachMarkProps {
  id: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

const CoachMark: React.FC<CoachMarkProps> = ({ id, message, position = 'bottom', children }) => {
  const key = `bellepoule-coach-${id}`;
  const [visible, setVisible] = useState(() => localStorage.getItem(key) !== 'seen');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => dismiss(), 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  const dismiss = () => {
    localStorage.setItem(key, 'seen');
    setVisible(false);
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 9999,
    background: '#1e40af',
    color: 'white',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    ...(position === 'bottom' ? { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
        position === 'top'    ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
        position === 'right'  ? { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' } :
                                { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }),
  };

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    ...(position === 'bottom' ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid #1e40af' } :
        position === 'top'    ? { top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e40af' } : {}),
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} onClick={visible ? dismiss : undefined}>
      {visible && (
        <span style={{
          position: 'absolute', inset: '-4px',
          borderRadius: '0.5rem',
          border: '2px solid #3b82f6',
          animation: 'coach-pulse 1.5s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 9998,
        }} />
      )}
      {children}
      {visible && (
        <div style={tooltipStyle}>
          <span style={arrowStyle} />
          {message}
        </div>
      )}
    </div>
  );
};

export default CoachMark;
