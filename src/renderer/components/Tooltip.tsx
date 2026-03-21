/**
 * BellePoule Modern - Tooltip Component
 * UX Improvement: Contextual help without clutter
 * Licensed under GPL-3.0
 */

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let x = 0,
        y = 0;

      switch (position) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - 8;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + 8;
          break;
        case 'left':
          x = rect.left - 8;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right + 8;
          y = rect.top + rect.height / 2;
          break;
      }

      setCoords({ x, y });
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      whiteSpace: 'nowrap',
      zIndex: 9999,
      pointerEvents: 'none',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.9)',
      transition: 'opacity 0.2s, transform 0.2s',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    };

    switch (position) {
      case 'top':
        return {
          ...base,
          left: coords.x,
          top: coords.y - 20,
          transform: `translate(-50%, -100%) scale(${isVisible ? 1 : 0.9})`,
        };
      case 'bottom':
        return {
          ...base,
          left: coords.x,
          top: coords.y + 20,
          transform: `translate(-50%, 0) scale(${isVisible ? 1 : 0.9})`,
        };
      case 'left':
        return {
          ...base,
          left: coords.x - 20,
          top: coords.y,
          transform: `translate(-100%, -50%) scale(${isVisible ? 1 : 0.9})`,
        };
      case 'right':
        return {
          ...base,
          left: coords.x + 20,
          top: coords.y,
          transform: `translate(0, -50%) scale(${isVisible ? 1 : 0.9})`,
        };
      default:
        return base;
    }
  };

  const getArrowStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      width: 0,
      height: 0,
      borderStyle: 'solid',
      zIndex: 9999,
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.2s',
    };

    switch (position) {
      case 'top':
        return {
          ...base,
          left: coords.x - 5,
          top: coords.y - 20,
          borderWidth: '5px 5px 0 5px',
          borderColor: '#1f2937 transparent transparent transparent',
        };
      case 'bottom':
        return {
          ...base,
          left: coords.x - 5,
          top: coords.y + 20,
          borderWidth: '0 5px 5px 5px',
          borderColor: 'transparent transparent #1f2937 transparent',
        };
      case 'left':
        return {
          ...base,
          left: coords.x - 20,
          top: coords.y - 5,
          borderWidth: '5px 0 5px 5px',
          borderColor: 'transparent transparent transparent #1f2937',
        };
      case 'right':
        return {
          ...base,
          left: coords.x + 20,
          top: coords.y - 5,
          borderWidth: '5px 5px 5px 0',
          borderColor: 'transparent #1f2937 transparent transparent',
        };
      default:
        return base;
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>
      {isVisible && (
        <>
          <div style={getTooltipStyle()}>{content}</div>
          <div style={getArrowStyle()} />
        </>
      )}
    </>
  );
};

// Icon Button with Tooltip
interface IconButtonProps {
  icon: string;
  tooltip: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export const IconButtonWithTooltip: React.FC<IconButtonProps> = ({
  icon,
  tooltip,
  onClick,
  variant = 'secondary',
  disabled = false,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: '#3b82f6', hover: '#2563eb', text: 'white' };
      case 'danger':
        return { bg: '#ef4444', hover: '#dc2626', text: 'white' };
      default:
        return { bg: '#f3f4f6', hover: '#e5e7eb', text: '#374151' };
    }
  };

  const colors = getColors();

  return (
    <Tooltip content={tooltip}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: colors.bg,
          color: colors.text,
          fontSize: '18px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={e => !disabled && (e.currentTarget.style.backgroundColor = colors.hover)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.bg)}
      >
        {icon}
      </button>
    </Tooltip>
  );
};

// Help Tooltip - For form inputs
interface HelpTooltipProps {
  text: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ text }) => {
  return (
    <Tooltip content={text} position="right">
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          color: '#6b7280',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'help',
          marginLeft: '6px',
        }}
      >
        ?
      </span>
    </Tooltip>
  );
};

export default Tooltip;
