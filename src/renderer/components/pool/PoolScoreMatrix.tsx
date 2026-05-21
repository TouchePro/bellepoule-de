import React, { useState, useEffect, useRef } from 'react';
import { Pool, Fencer, Score, MatchStatus, FencerStatus } from '../../../shared/types';
import { formatRatio, formatIndex } from '../../../shared/utils/poolCalculations';
import { ColumnId } from '../../hooks/useColumnVisibility';

interface PoolScoreMatrixProps {
  pool: Pool;
  isLaserSabre: boolean;
  isVisible: (columnId: ColumnId) => boolean;
  toggleColumn: (context: 'pool' | 'ranking', columnId: ColumnId) => void;
  onCellClick: (rowFencer: Fencer, colFencer: Fencer) => void;
  onFencerChangePool?: (fencer: Fencer) => void;
  onMatchReset?: (rowFencer: Fencer, colFencer: Fencer) => void;
  isLocked?: boolean;
}

const PoolScoreMatrix: React.FC<PoolScoreMatrixProps> = ({
  pool,
  isLaserSabre,
  isVisible,
  toggleColumn,
  onCellClick,
  onFencerChangePool,
  onMatchReset,
  isLocked = false,
}) => {
  const fencers = pool.fencers;
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const prevMatchesRef = useRef<typeof pool.matches>(pool.matches);

  useEffect(() => {
    const prev = prevMatchesRef.current;
    for (const match of pool.matches) {
      const old = prev.find(m => m.id === match.id);
      if (old && match.status === MatchStatus.FINISHED && old.status !== MatchStatus.FINISHED) {
        const key = `${match.fencerA?.id}-${match.fencerB?.id}`;
        setFlashCell(key);
        setTimeout(() => setFlashCell(null), 900);
        break;
      }
    }
    prevMatchesRef.current = pool.matches;
  }, [pool.matches]);

  const getScore = (fencerA: Fencer, fencerB: Fencer): Score | null => {
    const match = pool.matches.find(
      m =>
        (m.fencerA?.id === fencerA.id && m.fencerB?.id === fencerB.id) ||
        (m.fencerA?.id === fencerB.id && m.fencerB?.id === fencerA.id)
    );
    if (!match || match.status !== MatchStatus.FINISHED) return null;
    return match.fencerA?.id === fencerA.id ? match.scoreA : match.scoreB;
  };

  const calculateFencerStats = (fencer: Fencer) => {
    let v = 0, d = 0, td = 0, tr = 0;
    for (const match of pool.matches) {
      if (match.status !== MatchStatus.FINISHED) continue;
      if (match.fencerA?.id === fencer.id) {
        if (match.scoreA?.isVictory) v++;
        else d++;
        td += match.scoreA?.value || 0;
        tr += match.scoreB?.value || 0;
      } else if (match.fencerB?.id === fencer.id) {
        if (match.scoreB?.isVictory) v++;
        else d++;
        td += match.scoreB?.value || 0;
        tr += match.scoreA?.value || 0;
      }
    }
    return { v, d, td, tr, index: td - tr, ratio: v + d > 0 ? v / (v + d) : 0 };
  };

  return (
    <div className="pool-grid">
      <div className="pool-row">
        <div className="pool-cell pool-cell-header pool-cell-name"></div>
        {fencers.map((_, i) => (
          <div key={i} className="pool-cell pool-cell-header">
            {i + 1}
          </div>
        ))}
        {isVisible('victories') && (
          <div
            className="pool-cell pool-cell-header"
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'victories'); }}
            title="Clic droit pour masquer"
          >
            V
          </div>
        )}
        {isVisible('ratio') && (
          <div
            className="pool-cell pool-cell-header"
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'ratio'); }}
            title="Clic droit pour masquer"
          >
            V/M
          </div>
        )}
        {isVisible('td') && (
          <div
            className="pool-cell pool-cell-header"
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'td'); }}
            title="Clic droit pour masquer"
          >
            TD
          </div>
        )}
        {isVisible('tr') && (
          <div
            className="pool-cell pool-cell-header"
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'tr'); }}
            title="Clic droit pour masquer"
          >
            TR
          </div>
        )}
        {isVisible('quest') && isLaserSabre && (
          <div
            className="pool-cell pool-cell-header"
            style={{ color: '#7c3aed' }}
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'quest'); }}
            title="Clic droit pour masquer"
          >
            Quest
          </div>
        )}
        {isVisible('index') && (
          <div
            className="pool-cell pool-cell-header"
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'index'); }}
            title="Clic droit pour masquer"
          >
            Ind
          </div>
        )}
        {isVisible('rank') && (
          <div
            className="pool-cell pool-cell-header"
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'rank'); }}
            title="Clic droit pour masquer"
          >
            Rg
          </div>
        )}
      </div>

      {fencers.map((rowFencer, rowIndex) => {
        const stats = calculateFencerStats(rowFencer);
        const rankEntry = pool.ranking.find(r => r.fencer.id === rowFencer.id);
        const rankRatio = (rankEntry?.rank ?? fencers.length) / fencers.length;
        const rowBg =
          rankRatio <= 0.7
            ? 'rgba(16,185,129,0.08)'
            : rankRatio <= 0.9
              ? 'rgba(245,158,11,0.10)'
              : 'rgba(239,68,68,0.08)';

        const fencerMatches = pool.matches.filter(
          m =>
            m.status === MatchStatus.FINISHED &&
            (m.fencerA?.id === rowFencer.id || m.fencerB?.id === rowFencer.id)
        );
        const sparkBars = fencerMatches.map(m => {
          const isA = m.fencerA?.id === rowFencer.id;
          const won = isA ? m.scoreA?.isVictory : m.scoreB?.isVictory;
          return won;
        });

        return (
          <div key={rowFencer.id} className="pool-row" style={{ backgroundColor: rowBg }}>
            <div
              className="pool-cell pool-cell-header pool-cell-name"
              title={`${rowFencer.firstName} ${rowFencer.lastName}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span style={{ fontWeight: 500 }}>{rowIndex + 1}.</span>
              <span className="truncate" style={{ flex: 1 }}>
                {rowFencer.lastName}
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.25rem' }}>
                  {rowFencer.firstName}
                </span>
              </span>
              {sparkBars.length > 0 && (
                <svg width="16" height="10" style={{ flexShrink: 0 }} aria-hidden="true">
                  {sparkBars.map((won, i) => (
                    <rect
                      key={i}
                      x={i * (16 / sparkBars.length)}
                      y={won ? 0 : 4}
                      width={Math.max(1, 16 / sparkBars.length - 1)}
                      height={won ? 10 : 6}
                      fill={won ? '#22c55e' : '#ef4444'}
                    />
                  ))}
                </svg>
              )}
              {onFencerChangePool && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onFencerChangePool(rowFencer);
                  }}
                  title="Changer de poule"
                  style={{
                    padding: '0.125rem 0.25rem',
                    fontSize: '0.625rem',
                    background: '#e5e7eb',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    opacity: 0.6,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >
                  ↔
                </button>
              )}
            </div>

            {fencers.map((colFencer, colIndex) => {
              if (rowIndex === colIndex) {
                return <div key={colIndex} className="pool-cell pool-cell-diagonal"></div>;
              }

              const rowFencerAbandoned =
                rowFencer.status === FencerStatus.ABANDONED ||
                rowFencer.status === FencerStatus.FORFAIT ||
                rowFencer.status === FencerStatus.EXCLUDED;
              const colFencerAbandoned =
                colFencer.status === FencerStatus.ABANDONED ||
                colFencer.status === FencerStatus.FORFAIT ||
                colFencer.status === FencerStatus.EXCLUDED;

              if (rowFencerAbandoned || colFencerAbandoned) {
                return (
                  <div
                    key={colIndex}
                    className="pool-cell pool-cell-forfeit"
                    style={{
                      cursor: 'not-allowed',
                      backgroundColor: '#e5e7eb',
                      color: '#9ca3af',
                    }}
                    title="Match non disputé (abandon/forfait)"
                  >
                    <span>-</span>
                  </div>
                );
              }

              const score = getScore(rowFencer, colFencer);
              const cellClass = score
                ? score.isVictory
                  ? 'pool-cell-victory'
                  : 'pool-cell-defeat'
                : 'pool-cell-editable';

              const cellKey = `${rowFencer.id}-${colFencer.id}`;
              const mirrorKey = `${colFencer.id}-${rowFencer.id}`;
              const isFlashing = flashCell === cellKey || flashCell === mirrorKey;

              return (
                <div
                  key={colIndex}
                  className={`pool-cell ${cellClass} ${isFlashing ? 'pool-cell-flash' : ''}`}
                  onClick={() => !isLocked && onCellClick(rowFencer, colFencer)}
                  style={{ cursor: isLocked ? 'default' : 'pointer', position: 'relative' }}
                >
                  {score ? (
                    <>
                      <span>
                        {score.isVictory ? 'V' : ''}
                        {score.value}
                      </span>
                      {onMatchReset && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onMatchReset(rowFencer, colFencer);
                          }}
                          title="Annuler ce résultat"
                          className="pool-cell-reset-btn"
                          style={{
                            position: 'absolute',
                            top: '1px',
                            right: '1px',
                            padding: '0 2px',
                            fontSize: '0.55rem',
                            lineHeight: 1,
                            background: 'rgba(239,68,68,0.15)',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            opacity: 0,
                            transition: 'opacity 0.15s',
                            color: '#dc2626',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                        >
                          ↺
                        </button>
                      )}
                    </>
                  ) : (
                    <span style={{ color: '#9CA3AF' }}>-</span>
                  )}
                </div>
              );
            })}

            {isVisible('victories') && (
              <div className="pool-cell" style={{ fontWeight: 600 }}>
                {stats.v}
              </div>
            )}
            {isVisible('ratio') && (
              <div className="pool-cell text-sm">{formatRatio(stats.ratio)}</div>
            )}
            {isVisible('td') && <div className="pool-cell">{stats.td}</div>}
            {isVisible('tr') && <div className="pool-cell">{stats.tr}</div>}
            {isVisible('quest') && isLaserSabre && (
              <div className="pool-cell" style={{ fontWeight: 600, color: '#7c3aed' }}>
                {rankEntry?.questPoints ?? '-'}
              </div>
            )}
            {isVisible('index') && (
              <div
                className="pool-cell"
                style={{ color: stats.index >= 0 ? '#059669' : '#DC2626' }}
              >
                {formatIndex(stats.index)}
              </div>
            )}
            {isVisible('rank') && (
              <div className="pool-cell" style={{ fontWeight: 600 }}>
                {rankEntry?.rank || '-'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PoolScoreMatrix;
