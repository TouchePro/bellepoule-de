/**
 * BellePoule Modern - Skeleton Loading Components
 * UX Improvement: Better loading states
 * Licensed under GPL-3.0
 */

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className,
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        ...style,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        opacity: 0.7,
      }}
    />
  );
};

// Competition Card Skeleton
export const CompetitionCardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="60%" height="24px" />
        <Skeleton width="80px" height="20px" borderRadius="12px" />
      </div>
      <Skeleton width="40%" height="16px" />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Skeleton width="100px" height="32px" borderRadius="6px" />
        <Skeleton width="100px" height="32px" borderRadius="6px" />
      </div>
    </div>
  );
};

// Pool View Skeleton
export const PoolViewSkeleton: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Skeleton width="200px" height="32px" style={{ marginBottom: '16px' }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <Skeleton width="50%" height="20px" style={{ marginBottom: '12px' }} />
              {[1, 2, 3].map(j => (
                <div
                  key={j}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    padding: '8px 0',
                    borderBottom: j < 3 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <Skeleton width="40%" height="16px" />
                  <Skeleton width="60px" height="16px" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px',
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        alignItems: 'center',
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={i === 0 ? '80%' : '60%'} height="16px" />
      ))}
    </div>
  );
};

// Stats Card Skeleton
export const StatsCardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <Skeleton width="48px" height="48px" borderRadius="12px" />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height="16px" style={{ marginBottom: '8px' }} />
        <Skeleton width="40%" height="28px" />
      </div>
    </div>
  );
};

// Add shimmer keyframes to global styles
export const SkeletonStyles: React.FC = () => (
  <style>{`
    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `}</style>
);

export default {
  Skeleton,
  CompetitionCardSkeleton,
  PoolViewSkeleton,
  TableRowSkeleton,
  StatsCardSkeleton,
  SkeletonStyles,
};
