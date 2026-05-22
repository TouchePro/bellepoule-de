/**
 * BellePoule Modern - Pool Preparation View Component
 * Allows configuring pools before starting matches
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Fencer, Pool, Match, MatchStatus } from '../../shared/types';
import {
  calculateOptimalPoolCount,
  distributeFencersToPoolsSerpentine,
  generatePoolMatchOrder,
} from '../../shared/utils/poolCalculations';

interface PoolPrepViewProps {
  fencers: Fencer[];
  initialPools?: Pool[];
  maxScore: number;
  minFencersPerPool?: number;
  maxFencersPerPool?: number;
  expertMode?: boolean;
  onPoolsConfirm: (pools: Pool[]) => void;
  onSkipPools?: () => void;
  onSettingsChange?: (min: number, max: number) => void;
}

interface PoolStateHistory {
  pools: Pool[];
  poolCount: number;
  minFencersPerPool: number;
  maxFencersPerPool: number;
  timestamp: number;
}

const PoolPrepView: React.FC<PoolPrepViewProps> = ({
  fencers,
  initialPools,
  maxScore,
  minFencersPerPool: initialMin = 5,
  maxFencersPerPool: initialMax = 7,
  expertMode = false,
  onPoolsConfirm,
  onSkipPools,
  onSettingsChange,
}) => {
  const [poolCount, setPoolCount] = useState<number>(0);
  const [minFencersPerPool, setMinFencersPerPool] = useState<number>(initialMin);
  const [maxFencersPerPool, setMaxFencersPerPool] = useState<number>(initialMax);
  const [pools, setPools] = useState<Pool[]>(initialPools || []);
  const [draggedFencer, setDraggedFencer] = useState<{ fencer: Fencer; poolIndex: number } | null>(
    null
  );

  const [separationConfig, setSeparationConfig] = useState({
    byClub: true,
    byRegion: true,
    byNation: false,
  });

  // Empêche la réinitialisation si initialPools arrive en retard (async restore)
  const hasInitialized = useRef(false);

  // Initialisation de l'historique au premier setPools non vide
  const historyInitialized = useRef(false);

  // Historique des modifications pour la fonction restore
  const [history, setHistory] = useState<PoolStateHistory[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  const [timeSinceLastChange, setTimeSinceLastChange] = useState<number>(0);
  const RESTORE_WINDOW_MINUTES = 5;

  // Timer pour mettre à jour le temps écoulé
  useEffect(() => {
    const interval = setInterval(() => {
      if (history.length > 0 && currentHistoryIndex >= 0) {
        const lastChange = history[currentHistoryIndex]?.timestamp || Date.now();
        const elapsed = Math.floor((Date.now() - lastChange) / 1000);
        setTimeSinceLastChange(elapsed);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [history, currentHistoryIndex]);

  // Initialisation de l'historique à la première génération de poules
  useEffect(() => {
    if (pools.length > 0 && !historyInitialized.current) {
      historyInitialized.current = true;
      const initialState: PoolStateHistory = {
        pools: JSON.parse(JSON.stringify(pools)),
        poolCount,
        minFencersPerPool,
        maxFencersPerPool,
        timestamp: Date.now(),
      };
      setHistory([initialState]);
      setCurrentHistoryIndex(0);
    }
  }, [pools]);

  // Sauvegarder l'état actuel dans l'historique
  const saveToHistory = () => {
    const now = Date.now();
    const newState: PoolStateHistory = {
      pools: JSON.parse(JSON.stringify(pools)),
      poolCount,
      minFencersPerPool,
      maxFencersPerPool,
      timestamp: now,
    };

    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push(newState);

    const cutoffTime = now - RESTORE_WINDOW_MINUTES * 60 * 1000;
    const filteredHistory = newHistory.filter(state => state.timestamp >= cutoffTime);

    if (filteredHistory.length > 20) {
      filteredHistory.shift();
    }

    setHistory(filteredHistory);
    setCurrentHistoryIndex(filteredHistory.length - 1);
    setTimeSinceLastChange(0);
  };

  // Restaurer l'état précédent
  const handleRestore = () => {
    if (currentHistoryIndex > 0) {
      const previousState = history[currentHistoryIndex - 1];
      setPools(previousState.pools);
      setPoolCount(previousState.poolCount);
      setMinFencersPerPool(previousState.minFencersPerPool);
      setMaxFencersPerPool(previousState.maxFencersPerPool);
      setCurrentHistoryIndex(currentHistoryIndex - 1);
      setTimeSinceLastChange(0);
    }
  };

  const canRestore = (): boolean => {
    if (currentHistoryIndex <= 0) return false;

    const previousState = history[currentHistoryIndex - 1];
    if (!previousState) return false;

    const elapsed = Date.now() - previousState.timestamp;
    return elapsed <= RESTORE_WINDOW_MINUTES * 60 * 1000;
  };

  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  // Génère les poules avec la config passée explicitement (évite les closures périmées)
  const generatePools = (count: number, config: typeof separationConfig) => {
    if (fencers.length === 0 || count <= 0) return;

    const distribution = distributeFencersToPoolsSerpentine(fencers, count, config);

    const generatedPools: Pool[] = distribution.map((poolFencers, index) => {
      const matchOrder = generatePoolMatchOrder(poolFencers.length);
      const now = new Date();

      const matches: Match[] = matchOrder.map(([a, b], matchIndex) => ({
        id: `match-${index}-${matchIndex}`,
        number: matchIndex + 1,
        fencerA: poolFencers[a - 1],
        fencerB: poolFencers[b - 1],
        scoreA: null,
        scoreB: null,
        maxScore,
        status: MatchStatus.NOT_STARTED,
        poolId: `pool-${index}`,
        createdAt: now,
        updatedAt: now,
      }));

      return {
        id: `pool-${index}`,
        number: index + 1,
        phaseId: 'phase-pools',
        fencers: poolFencers,
        matches,
        referees: [],
        isComplete: false,
        hasError: false,
        ranking: [],
        createdAt: now,
        updatedAt: now,
      };
    });

    setPools(generatedPools);
  };

  // Initialisation unique : depuis initialPools (session restaurée) ou calcul optimal
  // Le ref hasInitialized empêche la réinitialisation si initialPools arrive en retard (async DB)
  useEffect(() => {
    if (initialPools && initialPools.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      historyInitialized.current = true;
      setPools(initialPools);
      setPoolCount(initialPools.length);
      const initialState: PoolStateHistory = {
        pools: JSON.parse(JSON.stringify(initialPools)),
        poolCount: initialPools.length,
        minFencersPerPool,
        maxFencersPerPool,
        timestamp: Date.now(),
      };
      setHistory([initialState]);
      setCurrentHistoryIndex(0);
    } else if (fencers.length > 0 && pools.length === 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      const optimalCount = calculateOptimalPoolCount(
        fencers.length,
        minFencersPerPool,
        maxFencersPerPool
      );
      setPoolCount(optimalCount);
      generatePools(optimalCount, separationConfig);
    }
  }, [fencers.length, initialPools]);

  const handlePoolCountChange = (newCount: number) => {
    if (newCount >= 0 && newCount <= Math.ceil(fencers.length / 3)) {
      saveToHistory();
      setPoolCount(newCount);
      if (newCount === 0) {
        setPools([]);
      } else {
        generatePools(newCount, separationConfig);
      }
    }
  };

  const handleMinFencersChange = (value: number) => {
    if (value >= 3 && value <= maxFencersPerPool) {
      saveToHistory();
      setMinFencersPerPool(value);
      onSettingsChange?.(value, maxFencersPerPool);
    }
  };

  const handleMaxFencersChange = (value: number) => {
    if (value >= minFencersPerPool && value <= 64) {
      saveToHistory();
      setMaxFencersPerPool(value);
      onSettingsChange?.(minFencersPerPool, value);
    }
  };

  const regenerateMatches = (pool: Pool): Pool => {
    const matchOrder = generatePoolMatchOrder(pool.fencers.length);
    const now = new Date();

    const newMatches: Match[] = matchOrder.map(([a, b], matchIndex) => ({
      id: `${pool.id}-match-${matchIndex}`,
      number: matchIndex + 1,
      fencerA: pool.fencers[a - 1],
      fencerB: pool.fencers[b - 1],
      scoreA: null,
      scoreB: null,
      maxScore,
      status: MatchStatus.NOT_STARTED,
      poolId: pool.id,
      createdAt: now,
      updatedAt: now,
    }));

    return {
      ...pool,
      matches: newMatches,
      isComplete: false,
      ranking: [],
      updatedAt: now,
    };
  };

  const handleDragStart = (fencer: Fencer, poolIndex: number) => {
    setDraggedFencer({ fencer, poolIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetPoolIndex: number) => {
    e.preventDefault();

    if (!draggedFencer || draggedFencer.poolIndex === targetPoolIndex) {
      setDraggedFencer(null);
      return;
    }

    saveToHistory();

    const movedFencer = draggedFencer.fencer;
    const fromPoolIndex = draggedFencer.poolIndex;

    const updatedPools = pools.map((pool, index) => {
      if (index === fromPoolIndex) {
        const newFencers = pool.fencers.filter(f => f.id !== movedFencer.id);
        return regenerateMatches({ ...pool, fencers: newFencers });
      }
      if (index === targetPoolIndex) {
        const newFencers = [...pool.fencers, movedFencer];
        return regenerateMatches({ ...pool, fencers: newFencers });
      }
      return pool;
    });

    setPools(updatedPools);
    setDraggedFencer(null);
  };

  const handleMoveFencer = (fencerId: string, fromPoolIndex: number, toPoolIndex: number) => {
    if (fromPoolIndex === toPoolIndex) return;

    const movedFencer = pools[fromPoolIndex].fencers.find(f => f.id === fencerId);
    if (!movedFencer) return;

    saveToHistory();

    const updatedPools = pools.map((pool, index) => {
      if (index === fromPoolIndex) {
        const newFencers = pool.fencers.filter(f => f.id !== fencerId);
        return regenerateMatches({ ...pool, fencers: newFencers });
      }
      if (index === toPoolIndex) {
        const newFencers = [...pool.fencers, movedFencer];
        return regenerateMatches({ ...pool, fencers: newFencers });
      }
      return pool;
    });

    setPools(updatedPools);
  };

  const handleMoveFencerUp = (poolIndex: number, fencerIndex: number) => {
    if (fencerIndex === 0) return;

    saveToHistory();

    const pool = pools[poolIndex];
    const newFencers = [...pool.fencers];
    [newFencers[fencerIndex - 1], newFencers[fencerIndex]] = [
      newFencers[fencerIndex],
      newFencers[fencerIndex - 1],
    ];

    const updatedPools = pools.map((p, i) =>
      i === poolIndex ? regenerateMatches({ ...p, fencers: newFencers }) : p
    );

    setPools(updatedPools);
  };

  const handleMoveFencerDown = (poolIndex: number, fencerIndex: number) => {
    const pool = pools[poolIndex];
    if (fencerIndex >= pool.fencers.length - 1) return;

    saveToHistory();

    const newFencers = [...pool.fencers];
    [newFencers[fencerIndex], newFencers[fencerIndex + 1]] = [
      newFencers[fencerIndex + 1],
      newFencers[fencerIndex],
    ];

    const updatedPools = pools.map((p, i) =>
      i === poolIndex ? regenerateMatches({ ...p, fencers: newFencers }) : p
    );

    setPools(updatedPools);
  };

  const handleStripChange = (poolIndex: number, strip: number | undefined) => {
    setPools(pools.map((p, i) => (i === poolIndex ? { ...p, strip } : p)));
  };

  const getFencerCountStats = () => {
    if (pools.length === 0) return { min: 0, max: 0, avg: 0 };

    const counts = pools.map(p => p.fencers.length);
    return {
      min: Math.min(...counts),
      max: Math.max(...counts),
      avg: (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1),
    };
  };

  const stats = getFencerCountStats();

  return (
    <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Configuration Panel */}
      <div
        className="pool-prep-config"
        style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.25rem',
            }}
          >
            Nombre de poules
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handlePoolCountChange(poolCount - 1)}
              disabled={poolCount <= 0}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              -
            </button>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                minWidth: '2rem',
                textAlign: 'center',
              }}
            >
              {poolCount}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => handlePoolCountChange(poolCount + 1)}
              disabled={poolCount >= Math.ceil(fencers.length / 3)}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              +
            </button>
            {poolCount !== 1 && (
              <button
                className="btn btn-secondary"
                onClick={() => handlePoolCountChange(1)}
                title="Mettre tous les tireurs dans une seule poule"
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', marginLeft: '0.25rem' }}
              >
                Poule unique
              </button>
            )}
          </div>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.25rem',
            }}
          >
            Tireurs par poule (min)
          </label>
          <input
            type="number"
            value={minFencersPerPool}
            onChange={e => handleMinFencersChange(parseInt(e.target.value) || 5)}
            min={3}
            max={maxFencersPerPool}
            style={{ width: '80px', padding: '0.5rem' }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.25rem',
            }}
          >
            Tireurs par poule (max)
          </label>
          <input
            type="number"
            value={maxFencersPerPool}
            onChange={e => handleMaxFencersChange(parseInt(e.target.value) || 7)}
            min={minFencersPerPool}
            max={64}
            style={{ width: '80px', padding: '0.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {(
            [
              { key: 'byClub', label: 'Séparer par club' },
              { key: 'byRegion', label: 'Séparer par région' },
              { key: 'byNation', label: 'Séparer par nation' },
            ] as { key: keyof typeof separationConfig; label: string }[]
          ).map(({ key, label }) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <input
                type="checkbox"
                checked={separationConfig[key]}
                onChange={e => {
                  const newConfig = { ...separationConfig, [key]: e.target.checked };
                  setSeparationConfig(newConfig);
                  if (poolCount > 0) generatePools(poolCount, newConfig);
                }}
              />
              {label}
            </label>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {fencers.length} tireurs répartis
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            Min: {stats.min}, Max: {stats.max}, Moy: {stats.avg}
          </div>
        </div>
      </div>

      {/* Pools Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: poolCount === 0 ? 'flex' : 'grid',
          gridTemplateColumns: poolCount === 0 ? undefined : 'repeat(auto-fill, minmax(280px, 1fr))',
          alignItems: poolCount === 0 ? 'center' : undefined,
          justifyContent: poolCount === 0 ? 'center' : undefined,
          gap: '1rem',
          padding: '0.5rem',
        }}
      >
        {poolCount === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏭</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Aucune poule
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              Passage direct au classement initial des tireurs
            </div>
          </div>
        ) : null}
        {pools.map((pool, poolIndex) => (
          <div
            key={pool.id}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, poolIndex)}
            className={`pool-prep-card${draggedFencer?.poolIndex === poolIndex ? ' pool-prep-card-active' : ''}`}
          style={{ borderRadius: '8px', padding: '1rem', minHeight: '200px' }}
          >
            <div
              className="pool-prep-card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                paddingBottom: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Poule {pool.number}</h3>
                {pools.length === 1 && (
                  <span
                    className="pool-prep-badge-unique"
                  >
                    Poule unique
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {expertMode && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#6b7280' }}>
                    Piste
                    <input
                      type="number"
                      min={1}
                      value={pool.strip ?? ''}
                      placeholder="–"
                      onChange={e => {
                        const val = e.target.value;
                        handleStripChange(poolIndex, val === '' ? undefined : Math.max(1, parseInt(val)));
                      }}
                      style={{ width: '52px', padding: '0.1rem 0.3rem', fontSize: '0.8rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                  </label>
                )}
                <span
                  style={{
                    fontSize: '0.875rem',
                    color:
                      pools.length > 1 &&
                      (pool.fencers.length < minFencersPerPool ||
                        pool.fencers.length > maxFencersPerPool)
                        ? '#dc2626'
                        : '#6b7280',
                  }}
                >
                  {pool.fencers.length} tireurs
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {pool.fencers.map((fencer, fencerIndex) => (
                <div
                  key={fencer.id}
                  draggable
                  onDragStart={() => handleDragStart(fencer, poolIndex)}
                  className={`pool-prep-fencer-row${draggedFencer?.fencer.id === fencer.id ? ' pool-prep-fencer-row-dragging' : ''}`}
                >
                  <span style={{ fontWeight: 500, minWidth: '1.5rem' }}>{fencerIndex + 1}.</span>
                  <span style={{ flex: 1 }}>
                    {fencer.firstName} {fencer.lastName.charAt(0)}.
                    {fencer.club ? ` (${fencer.club})` : ''}
                  </span>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {fencerIndex > 0 && (
                      <button
                        onClick={() => handleMoveFencerUp(poolIndex, fencerIndex)}
                        title="Monter dans l'ordre"
                        className="pool-prep-btn-move"
                      >
                        ↑
                      </button>
                    )}
                    {fencerIndex < pool.fencers.length - 1 && (
                      <button
                        onClick={() => handleMoveFencerDown(poolIndex, fencerIndex)}
                        title="Descendre dans l'ordre"
                        className="pool-prep-btn-move"
                      >
                        ↓
                      </button>
                    )}
                    {poolIndex > 0 && (
                      <button
                        onClick={() => handleMoveFencer(fencer.id, poolIndex, poolIndex - 1)}
                        title="Déplacer vers la poule précédente"
                        className="pool-prep-btn-shift"
                      >
                        ←
                      </button>
                    )}
                    {poolIndex < pools.length - 1 && (
                      <button
                        onClick={() => handleMoveFencer(fencer.id, poolIndex, poolIndex + 1)}
                        title="Déplacer vers la poule suivante"
                        className="pool-prep-btn-shift"
                      >
                        →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pool.fencers.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#9ca3af',
                  fontSize: '0.875rem',
                }}
              >
                Déposez des tireurs ici
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div
        className="pool-prep-hint"
      >
        💡 <strong>Astuce :</strong> Glissez-déposez les tireurs entre les poules ou utilisez les
        flèches (← →) pour les déplacer entre poules. Utilisez les flèches (↑ ↓) pour changer
        l'ordre des tireurs dans une poule.
      </div>

      {/* Action Buttons */}
      <div
        className="pool-prep-footer"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1rem',
          paddingTop: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRestore}
            disabled={!canRestore()}
            style={{
              fontSize: '0.875rem',
              padding: '0.5rem 1rem',
              opacity: canRestore() ? 1 : 0.5,
            }}
          >
            ↩️ Annuler
          </button>
          {canRestore() && (
            <span
              style={{
                fontSize: '0.75rem',
                color:
                  timeSinceLastChange > RESTORE_WINDOW_MINUTES * 60 - 60 ? '#dc2626' : '#6b7280',
              }}
            >
              {formatElapsedTime(timeSinceLastChange)} / {RESTORE_WINDOW_MINUTES}min
            </span>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={() => (poolCount === 0 ? onSkipPools?.() : onPoolsConfirm(pools))}
          disabled={poolCount > 0 && (pools.length === 0 || pools.some(p => p.fencers.length < 3))}
          style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
        >
          {poolCount === 0 ? 'Passer au classement initial →' : 'Lancer les poules →'}
        </button>
      </div>
    </div>
  );
};

export default React.memo(PoolPrepView);
