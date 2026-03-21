/**
 * BellePoule Modern - Dashboard & Charts Components
 * Modern data visualization components
 * Licensed under GPL-3.0
 */

import React from 'react';

// Modern Stat Card with icon and trend
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: { value: number; isPositive: boolean };
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}

export const ModernStatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color }) => {
  const colors = {
    blue: { bg: '#eff6ff', icon: '#3b82f6', text: '#1e40af' },
    green: { bg: '#f0fdf4', icon: '#10b981', text: '#065f46' },
    orange: { bg: '#fff7ed', icon: '#f97316', text: '#9a3412' },
    purple: { bg: '#faf5ff', icon: '#a855f7', text: '#6b21a8' },
    red: { bg: '#fef2f2', icon: '#ef4444', text: '#991b1b' },
  };

  const theme = colors[color];

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #f3f4f6',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          backgroundColor: theme.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{title}</p>
        <h3 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#111827' }}>
          {value}
        </h3>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <span
              style={{
                color: trend.isPositive ? '#10b981' : '#ef4444',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>vs dernier mois</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Activity Timeline
interface TimelineItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
}

export const ActivityTimeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  return (
    <div style={{ padding: '20px' }}>
      {items.map((item, index) => (
        <div key={item.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
          {/* Line */}
          {index < items.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: '20px',
                top: '40px',
                bottom: '-20px',
                width: '2px',
                backgroundColor: '#e5e7eb',
              }}
            />
          )}

          {/* Icon */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: item.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
              zIndex: 1,
            }}
          >
            {item.icon}
          </div>

          {/* Content */}
          <div style={{ flex: 1, paddingBottom: '24px' }}>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '12px' }}>{item.time}</p>
            <h4 style={{ margin: '4px 0', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {item.title}
            </h4>
            {item.description && (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Mini Chart (Sparkline)
export const Sparkline: React.FC<{
  data: number[];
  color?: string;
  height?: number;
}> = ({ data, color = '#3b82f6', height = 40 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height, width: '100%' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        points={points}
        style={{ transition: 'all 0.3s ease' }}
      />
      <polygon fill={`${color}20`} stroke="none" points={`0,100 ${points} 100,100`} />
    </svg>
  );
};

// Comparison Bar
export const ComparisonBar: React.FC<{
  label: string;
  valueA: number;
  valueB: number;
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
}> = ({ label, valueA, valueB, labelA, labelB, colorA = '#3b82f6', colorB = '#10b981' }) => {
  const total = valueA + valueB || 1;
  const percentA = (valueA / total) * 100;
  const percentB = (valueB / total) * 100;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{label}</span>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
          <span style={{ color: colorA }}>
            {labelA}: {valueA}
          </span>
          <span style={{ color: colorB }}>
            {labelB}: {valueB}
          </span>
        </div>
      </div>
      <div
        style={{
          height: '24px',
          backgroundColor: '#f3f4f6',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: `${percentA}%`,
            backgroundColor: colorA,
            transition: 'width 0.5s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '11px',
            fontWeight: '600',
          }}
        >
          {percentA > 15 && `${Math.round(percentA)}%`}
        </div>
        <div
          style={{
            width: `${percentB}%`,
            backgroundColor: colorB,
            transition: 'width 0.5s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '11px',
            fontWeight: '600',
          }}
        >
          {percentB > 15 && `${Math.round(percentB)}%`}
        </div>
      </div>
    </div>
  );
};

// Leaderboard Item
export const LeaderboardItem: React.FC<{
  rank: number;
  name: string;
  score: number;
  avatar?: string;
  isCurrentUser?: boolean;
}> = ({ rank, name, score, avatar, isCurrentUser }) => {
  const getRankColor = () => {
    switch (rank) {
      case 1:
        return '#fbbf24'; // gold
      case 2:
        return '#9ca3af'; // silver
      case 3:
        return '#f97316'; // bronze
      default:
        return '#e5e7eb';
    }
  };

  const getRankIcon = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: isCurrentUser ? '#eff6ff' : 'white',
        borderRadius: '12px',
        border: isCurrentUser ? '2px solid #3b82f6' : '1px solid #f3f4f6',
        marginBottom: '8px',
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: getRankColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: rank <= 3 ? '20px' : '14px',
          fontWeight: 'bold',
        }}
      >
        {getRankIcon()}
      </div>

      {avatar ? (
        <img
          src={avatar}
          alt={name}
          style={{ width: '40px', height: '40px', borderRadius: '50%' }}
        />
      ) : (
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          {name.charAt(0)}
        </div>
      )}

      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: '600', color: '#111827' }}>{name}</span>
        {isCurrentUser && (
          <span
            style={{ marginLeft: '8px', fontSize: '12px', color: '#3b82f6', fontWeight: '500' }}
          >
            (Vous)
          </span>
        )}
      </div>

      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>{score}</span>
        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>pts</span>
      </div>
    </div>
  );
};

// Empty State Illustration
export const EmptyState: React.FC<{
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, description, actionLabel, onAction }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '60px',
          marginBottom: '24px',
        }}
      >
        {icon}
      </div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#374151' }}>{title}</h3>
      <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280', maxWidth: '400px' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Weather/Condition Widget
export const ConditionWidget: React.FC<{
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  label: string;
  value: string;
}> = ({ condition, label, value }) => {
  const conditions = {
    excellent: { color: '#10b981', icon: '✨', label: 'Excellent' },
    good: { color: '#3b82f6', icon: '👍', label: 'Bon' },
    fair: { color: '#f59e0b', icon: '⚠️', label: 'Moyen' },
    poor: { color: '#ef4444', icon: '🔴', label: 'Faible' },
  };

  const theme = conditions[condition];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: `2px solid ${theme.color}30`,
        boxShadow: `0 4px 12px ${theme.color}20`,
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: `${theme.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}
      >
        {theme.icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{label}</p>
        <p
          style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: theme.color }}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

export default {
  ModernStatCard,
  ActivityTimeline,
  Sparkline,
  ComparisonBar,
  LeaderboardItem,
  EmptyState,
  ConditionWidget,
};
