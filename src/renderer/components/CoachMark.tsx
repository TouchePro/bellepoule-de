/**
 * BellePoule Modern - CoachMark Component
 * Licensed under GPL-3.0
 */

import React, { useState } from 'react';

interface CoachMarkProps {
  id?: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

const CoachMark: React.FC<CoachMarkProps> = ({ message, position = 'bottom', children }) => {
  // Sous-titre affiché uniquement au survol / focus du bouton
  const [visible, setVisible] = useState(false);

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
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
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

export default React.memo(CoachMark);
