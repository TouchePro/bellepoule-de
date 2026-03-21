/**
 * BellePoule Modern - Pool Preparation View Component
 * Allows configuring pools before starting matches
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect } from 'react';
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
  onPoolsConfirm: (pools: Pool[]) => void;
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
  onPoolsConfirm,
  onSettingsChange,
}) => {
  const [poolCount, setPoolCount] = useState<number>(0);
  const [minFencersPerPool, setMinFencersPerPool] = useState<number>(initialMin);
  const [maxFencersPerPool, setMaxFencersPerPool] = useState<number>(initialMax);
  const [pools, setPools] = useState<Pool[]>(initialPools || []);
  const [draggedFencer, setDraggedFencer] = useState<{ fencer: Fencer; poolIndex: number } | null>(
    null
  );

  // Historique des modifications pour la fonction restore
  const [history, setHistory] = useState<PoolStateHistory[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  const [timeSinceLastChange, setTimeSinceLastChange] = useState<number>(0);
  const RESTORE_WINDOW_MINUTES = 5; // Fenêtre de 5 minutes pour restaurer

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

    // Supprimer les états futurs si on est en plein milieu de l'historique
    const newHistory = history.slice(0, currentHistoryIndex + 1);

    // Ajouter le nouvel état
    newHistory.push(newState);

    // Nettoyer les états trop vieux (plus de RESTORE_WINDOW_MINUTES minutes)
    const cutoffTime = now - RESTORE_WINDOW_MINUTES * 60 * 1000;
    const filteredHistory = newHistory.filter(state => state.timestamp >= cutoffTime);

    // Limiter à 20 états maximum
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

  // Vérifier si on peut restaurer (état précédent existe et dans la fenêtre de temps)
  const canRestore = (): boolean => {
    if (currentHistoryIndex <= 0) return false;

    const previousState = history[currentHistoryIndex - 1];
    if (!previousState) return false;

    const elapsed = Date.now() - previousState.timestamp;
    return elapsed <= RESTORE_WINDOW_MINUTES * 60 * 1000;
  };

  // Formater le temps écoulé
  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  // Initialize pools from initialPools when component mounts or initialPools changes
  useEffect(() => {
    if (initialPools && initialPools.length > 0) {
      setPools(initialPools);
      setPoolCount(initialPools.length);
      // Initialize history with the loaded state
      const initialState: PoolStateHistory = {
        pools: JSON.parse(JSON.stringify(initialPools)),
        poolCount: initialPools.length,
        minFencersPerPool,
        maxFencersPerPool,
        timestamp: Date.now(),
      };
      setHistory([initialState]);
      setCurrentHistoryIndex(0);
    } else if (fencers.length > 0 && pools.length === 0) {
      const optimalCount = calculateOptimalPoolCount(
        fencers.length,
        minFencersPerPool,
        maxFencersPerPool
      );
      setPoolCount(optimalCount);
      generatePools(optimalCount);
    }
  }, [fencers.length, initialPools]);

  // Recalculate optimal pool count when min/max fencers change
  useEffect(() => {
    if (fencers.length > 0 && pools.length > 0) {
      const optimalCount = calculateOptimalPoolCount(
        fencers.length,
        minFencersPerPool,
        maxFencersPerPool
      );
      if (optimalCount !== poolCount) {
        setPoolCount(optimalCount);
      }
    }
  }, [minFencersPerPool, maxFencersPerPool]);

  // Regenerate pools when count changes
  useEffect(() => {
    if (poolCount > 0 && fencers.length > 0) {
      generatePools(poolCount);
    }
  }, [poolCount]);

  const generatePools = (count: number) => {
    if (fencers.length === 0) return;

    const distribution = distributeFencersToPoolsSerpentine(fencers, count, {
      byClub: true,
      byLeague: true,
      byNation: false,
    });

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

    // Sauvegarder l'état initial dans l'historique
    const initialState: PoolStateHistory = {
      pools: JSON.parse(JSON.stringify(generatedPools)),
      poolCount: count,
      minFencersPerPool,
      maxFencersPerPool,
      timestamp: Date.now(),
    };
    setHistory([initialState]);
    setCurrentHistoryIndex(0);
  };

  const handlePoolCountChange = (newCount: number) => {
    if (newCount >= 1 && newCount <= Math.ceil(fencers.length / 3)) {
      saveToHistory();
      setPoolCount(newCount);
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
    if (value >= minFencersPerPool && value <= 10) {
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

    const updatedPools = [...pools];
    const fromPool = updatedPools[draggedFencer.poolIndex];
    const toPool = updatedPools[targetPoolIndex];

    // Remove fencer from source pool
    fromPool.fencers = fromPool.fencers.filter(f => f.id !== draggedFencer.fencer.id);

    // Add fencer to target pool
    toPool.fencers.push(draggedFencer.fencer);

    // Regenerate matches for both pools
    updatedPools[draggedFencer.poolIndex] = regenerateMatches(fromPool);
    updatedPools[targetPoolIndex] = regenerateMatches(toPool);

    setPools(updatedPools);
    setDraggedFencer(null);
  };

  const handleMoveFencer = (fencerId: string, fromPoolIndex: number, toPoolIndex: number) => {
    if (fromPoolIndex === toPoolIndex) return;

    saveToHistory();

    const updatedPools = [...pools];
    const fromPool = updatedPools[fromPoolIndex];
    const toPool = updatedPools[toPoolIndex];

    const fencerIndex = fromPool.fencers.findIndex(f => f.id === fencerId);
    if (fencerIndex === -1) return;

    const fencer = fromPool.fencers[fencerIndex];
    fromPool.fencers.splice(fencerIndex, 1);
    toPool.fencers.push(fencer);

    updatedPools[fromPoolIndex] = regenerateMatches(fromPool);
    updatedPools[toPoolIndex] = regenerateMatches(toPool);

    setPools(updatedPools);
  };

  const handleMoveFencerUp = (poolIndex: number, fencerIndex: number) => {
    if (fencerIndex === 0) return;

    saveToHistory();

    const updatedPools = [...pools];
    const pool = updatedPools[poolIndex];

    // Échanger avec le tireur précédent
    const temp = pool.fencers[fencerIndex];
    pool.fencers[fencerIndex] = pool.fencers[fencerIndex - 1];
    pool.fencers[fencerIndex - 1] = temp;

    updatedPools[poolIndex] = regenerateMatches(pool);

    setPools(updatedPools);
  };

  const handleMoveFencerDown = (poolIndex: number, fencerIndex: number) => {
    const pool = pools[poolIndex];
    if (fencerIndex >= pool.fencers.length - 1) return;

    saveToHistory();

    const updatedPools = [...pools];
    const updatedPool = updatedPools[poolIndex];

    // Échanger avec le tireur suivant
    const temp = updatedPool.fencers[fencerIndex];
    updatedPool.fencers[fencerIndex] = updatedPool.fencers[fencerIndex + 1];
    updatedPool.fencers[fencerIndex + 1] = temp;

    updatedPools[poolIndex] = regenerateMatches(updatedPool);

    setPools(updatedPools);
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
        style={{
          background: '#f9fafb',
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
              disabled={poolCount <= 1}
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
            max={10}
            style={{ width: '80px', padding: '0.5rem' }}
          />
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
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
          padding: '0.5rem',
        }}
      >
        {pools.map((pool, poolIndex) => (
          <div
            key={pool.id}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, poolIndex)}
            style={{
              background: 'white',
              border: `2px dashed ${draggedFencer?.poolIndex === poolIndex ? '#e5e7eb' : '#d1d5db'}`,
              borderRadius: '8px',
              padding: '1rem',
              minHeight: '200px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Poule {pool.number}</h3>
              <span
                style={{
                  fontSize: '0.875rem',
                  color:
                    pool.fencers.length < minFencersPerPool ||
                    pool.fencers.length > maxFencersPerPool
                      ? '#dc2626'
                      : '#6b7280',
                }}
              >
                {pool.fencers.length} tireurs
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {pool.fencers.map((fencer, fencerIndex) => (
                <div
                  key={fencer.id}
                  draggable
                  onDragStart={() => handleDragStart(fencer, poolIndex)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: draggedFencer?.fencer.id === fencer.id ? '#dbeafe' : '#f3f4f6',
                    borderRadius: '4px',
                    cursor: 'move',
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ fontWeight: 500, minWidth: '1.5rem' }}>{fencerIndex + 1}.</span>
                  <span style={{ flex: 1 }}>
                    {fencer.firstName} {fencer.lastName.charAt(0)}.
                    {fencer.club ? ` (${fencer.club})` : ''}
                  </span>

                  {/* Move buttons */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {/* Monter dans l'ordre */}
                    {fencerIndex > 0 && (
                      <button
                        onClick={() => handleMoveFencerUp(poolIndex, fencerIndex)}
                        title="Monter dans l'ordre"
                        style={{
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.75rem',
                          background: '#dbeafe',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        ↑
                      </button>
                    )}
                    {/* Descendre dans l'ordre */}
                    {fencerIndex < pool.fencers.length - 1 && (
                      <button
                        onClick={() => handleMoveFencerDown(poolIndex, fencerIndex)}
                        title="Descendre dans l'ordre"
                        style={{
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.75rem',
                          background: '#dbeafe',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        ↓
                      </button>
                    )}
                    {poolIndex > 0 && (
                      <button
                        onClick={() => handleMoveFencer(fencer.id, poolIndex, poolIndex - 1)}
                        title="Déplacer vers la poule précédente"
                        style={{
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.75rem',
                          background: '#e5e7eb',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        ←
                      </button>
                    )}
                    {poolIndex < pools.length - 1 && (
                      <button
                        onClick={() => handleMoveFencer(fencer.id, poolIndex, poolIndex + 1)}
                        title="Déplacer vers la poule suivante"
                        style={{
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.75rem',
                          background: '#e5e7eb',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
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
        style={{
          background: '#eff6ff',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          marginTop: '1rem',
          fontSize: '0.875rem',
          color: '#1e40af',
        }}
      >
        💡 <strong>Astuce :</strong> Glissez-déposez les tireurs entre les poules ou utilisez les
        flèches (← →) pour les déplacer entre poules. Utilisez les flèches (↑ ↓) pour changer
        l'ordre des tireurs dans une poule.
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        {/* Bouton Annuler / Restore */}
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
          onClick={() => onPoolsConfirm(pools)}
          disabled={pools.length === 0 || pools.some(p => p.fencers.length < 3)}
          style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
        >
          Lancer les poules →
        </button>
      </div>
    </div>
  );
};

export default PoolPrepView;
