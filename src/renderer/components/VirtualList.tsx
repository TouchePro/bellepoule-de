/**
 * BellePoule Modern - Virtual List Component
 * Performance optimization for rendering large lists
 * Licensed under GPL-3.0
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
  overscan?: number;
  className?: string;
}

const VirtualList = <T,>({
  items,
  itemHeight,
  renderItem,
  containerHeight = 600,
  overscan = 5,
  className = '',
}: VirtualListProps<T>): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: Math.min(items.length - 1, start + visibleCount + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, idx) => ({
      item,
      index: startIndex + idx,
    }));
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              height: itemHeight,
              left: 0,
              right: 0,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(VirtualList) as typeof VirtualList;
