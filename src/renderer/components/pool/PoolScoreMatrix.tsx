import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  // Index unique des matchs terminés : O(m) au lieu de O(n²·m) par rendu.
  const scoreMap = useMemo(() => {
    const map = new Map<string, Score | null>();
    for (const m of pool.matches) {
      if (m.status !== MatchStatus.FINISHED) continue;
      const a = m.fencerA?.id;
      const b = m.fencerB?.id;
      if (!a || !b) continue;
      map.set(`${a}-${b}`, m.scoreA ?? null);
      map.set(`${b}-${a}`, m.scoreB ?? null);
    }
    return map;
  }, [pool.matches]);

  type Stats = { v: number; d: number; td: number; tr: number; index: number; ratio: number };
  const statsMap = useMemo(() => {
    const map = new Map<string, Stats>();
    const ensure = (id: string) =>
      map.get(id) ?? map.set(id, { v: 0, d: 0, td: 0, tr: 0, index: 0, ratio: 0 }).get(id)!;
    for (const match of pool.matches) {
      if (match.status !== MatchStatus.FINISHED) continue;
      const a = match.fencerA?.id;
      const b = match.fencerB?.id;
      if (a) {
        const s = ensure(a);
        if (match.scoreA?.isVictory) s.v++;
        else s.d++;
        s.td += match.scoreA?.value || 0;
        s.tr += match.scoreB?.value || 0;
      }
      if (b) {
        const s = ensure(b);
        if (match.scoreB?.isVictory) s.v++;
        else s.d++;
        s.td += match.scoreB?.value || 0;
        s.tr += match.scoreA?.value || 0;
      }
    }
    for (const s of map.values()) {
      s.index = s.td - s.tr;
      s.ratio = s.v + s.d > 0 ? s.v / (s.v + s.d) : 0;
    }
    return map;
  }, [pool.matches]);

  const getScore = (fencerA: Fencer, fencerB: Fencer): Score | null =>
    scoreMap.get(`${fencerA.id}-${fencerB.id}`) ?? null;

  const calculateFencerStats = (fencer: Fencer): Stats =>
    statsMap.get(fencer.id) ?? { v: 0, d: 0, td: 0, tr: 0, index: 0, ratio: 0 };

  // Données par ligne précalculées : sparkline + rang. Évite un filtre O(n·m) par rendu.
  const rowDataMap = useMemo(() => {
    const rankById = new Map(pool.ranking?.map(r => [r.fencer.id, r]) ?? []);
    const sparkById = new Map<string, boolean[]>();
    for (const f of fencers) sparkById.set(f.id, []);
    for (const m of pool.matches) {
      if (m.status !== MatchStatus.FINISHED) continue;
      if (m.fencerA?.id && sparkById.has(m.fencerA.id)) {
        sparkById.get(m.fencerA.id)!.push(!!m.scoreA?.isVictory);
      }
      if (m.fencerB?.id && sparkById.has(m.fencerB.id)) {
        sparkById.get(m.fencerB.id)!.push(!!m.scoreB?.isVictory);
      }
    }
    return { rankById, sparkById };
  }, [pool.matches, pool.ranking, fencers]);

  return (
    <div className="pool-grid">
      <div className="pool-row">
        <div className="pool-cell pool-cell-header pool-cell-name"></div>
        {fencers.map((f, i) => (
          <div key={f.id} className="pool-cell pool-cell-header">
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
        {isVisible('club') && (
          <div
            className="pool-cell pool-cell-header"
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'club'); }}
            title="Clic droit pour masquer"
          >
            Club
          </div>
        )}
        {isVisible('nation') && (
          <div
            className="pool-cell pool-cell-header"
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'nation'); }}
            title="Clic droit pour masquer"
          >
            Nat
          </div>
        )}
        {isVisible('region') && (
          <div
            className="pool-cell pool-cell-header"
            onContextMenu={e => { e.preventDefault(); toggleColumn('pool', 'region'); }}
            title="Clic droit pour masquer"
          >
            Rég
          </div>
        )}
      </div>

      {fencers.map((rowFencer, rowIndex) => {
        const stats = calculateFencerStats(rowFencer);
        const rankEntry = rowDataMap.rankById.get(rowFencer.id);
        const rankRatio = (rankEntry?.rank ?? fencers.length) / fencers.length;
        const rowBg =
          rankRatio <= 0.7
            ? 'rgba(16,185,129,0.08)'
            : rankRatio <= 0.9
              ? 'rgba(245,158,11,0.10)'
              : 'rgba(239,68,68,0.08)';

        const sparkBars = rowDataMap.sparkById.get(rowFencer.id) ?? [];

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
                return <div key={colFencer.id} className="pool-cell pool-cell-diagonal"></div>;
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
                    key={colFencer.id}
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
                  key={colFencer.id}
                  className={`pool-cell ${cellClass} ${isFlashing ? 'pool-cell-flash' : ''}`}
                  onClick={() => !isLocked && onCellClick(rowFencer, colFencer)}
                  onKeyDown={e => {
                    if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onCellClick(rowFencer, colFencer);
                    }
                  }}
                  role="button"
                  tabIndex={isLocked ? -1 : 0}
                  aria-label={`${rowFencer.lastName} ${rowFencer.firstName} contre ${colFencer.lastName} ${colFencer.firstName}${
                    score ? ` : ${score.isVictory ? 'victoire ' : 'défaite '}${score.value}` : ', saisir le score'
                  }`}
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
            {isVisible('club') && (
              <div className="pool-cell" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {rowFencer.club ?? ''}
              </div>
            )}
            {isVisible('nation') && (
              <div className="pool-cell" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                {rowFencer.nationality ?? ''}
              </div>
            )}
            {isVisible('region') && (
              <div className="pool-cell" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {rowFencer.region ?? ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(PoolScoreMatrix);
