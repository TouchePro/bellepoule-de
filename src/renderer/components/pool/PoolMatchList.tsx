/**
 * BellePoule Modern - Pool Match List Sub-component
 * Licensed under GPL-3.0
 */

import React, { useState } from 'react';
import { Match, Fencer, FencerStatus } from '../../../shared/types';
import { Arena } from '../../../shared/types/remote';
import {
  ROW_BETWEEN,
  CELL_CENTER,
  SUB_TEXT,
  VS_SEP,
  NAME_BIG,
  COL_GAP,
  NUM_BADGE,
  SECTION_TITLE,
} from './poolMatchList.styles';

interface OrderedMatchEntry {
  match: Match;
  index: number;
}

interface OrderedMatches {
  pending: OrderedMatchEntry[];
  finished: OrderedMatchEntry[];
  cancelled: OrderedMatchEntry[];
}

interface PoolMatchListProps {
  orderedMatches: OrderedMatches;
  isLaserSabre: boolean;
  isLocked: boolean;
  openScoreModal: (index: number) => void;
  onMatchReset?: (index: number) => void;
  onShowMatchAudit?: (matchId: string) => void;
  defaultArena?: number;
  arenaCount?: number;
  arenas?: Arena[];
  isRemoteActive?: boolean;
  matchArenaOverrides?: Map<string, number>;
  onMatchArenaChange?: (
    matchId: string,
    oldArena: number,
    newArena: number | null,
    fencerA?: Fencer | null,
    fencerB?: Fencer | null
  ) => void;
}

interface ArenaBadgeProps {
  match: Match;
  defaultArena: number;
  matchArenaOverrides?: Map<string, number>;
  isRemoteActive: boolean;
  arenaCount: number;
  dark?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const ArenaBadge: React.FC<ArenaBadgeProps> = ({
  match,
  defaultArena,
  matchArenaOverrides,
  isRemoteActive,
  arenaCount,
  dark = false,
  onClick,
}) => {
  if (arenaCount <= 0) return null;
  const assignedArena = matchArenaOverrides?.get(match.id) ?? defaultArena;
  const isOverridden = matchArenaOverrides?.has(match.id) ?? false;

  const baseStyle: React.CSSProperties = {
    padding: '0.15rem 0.45rem',
    fontSize: '0.7rem',
    fontWeight: '600',
    borderRadius: '4px',
    flexShrink: 0,
    cursor: isRemoteActive ? 'pointer' : 'not-allowed',
  };

  const activeStyle: React.CSSProperties = dark
    ? {
        border: isOverridden ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.4)',
        background: isOverridden ? '#fef3c7' : 'rgba(255,255,255,0.2)',
        color: isOverridden ? '#92400e' : 'white',
      }
    : {
        border: isOverridden ? '1px solid #f59e0b' : '1px solid #d1d5db',
        background: isOverridden ? '#fef3c7' : '#f3f4f6',
        color: isOverridden ? '#92400e' : '#374151',
      };

  const inactiveStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    color: '#9ca3af',
  };

  return (
    <button
      onClick={isRemoteActive ? onClick : undefined}
      title={isRemoteActive ? `Piste ${assignedArena} — Cliquer pour réassigner` : 'Serveur distant non démarré'}
      disabled={!isRemoteActive}
      style={{ ...baseStyle, ...(isRemoteActive ? activeStyle : inactiveStyle) }}
    >
      🏟 {assignedArena}
    </button>
  );
};

const PoolMatchListComponent: React.FC<PoolMatchListProps> = ({
  orderedMatches,
  isLaserSabre: _isLaserSabre,
  isLocked,
  openScoreModal,
  onMatchReset,
  onShowMatchAudit,
  defaultArena = 1,
  arenaCount = 0,
  arenas = [],
  isRemoteActive = false,
  matchArenaOverrides,
  onMatchArenaChange,
}) => {
  const [showArenaModal, setShowArenaModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const openArenaModal = (match: Match, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRemoteActive || arenaCount <= 0) return;
    setSelectedMatch(match);
    setShowArenaModal(true);
  };

  const closeArenaModal = () => {
    setShowArenaModal(false);
    setSelectedMatch(null);
  };

  const handleAssignArena = (arenaNum: number | null) => {
    if (!selectedMatch) return;
    const currentArena = matchArenaOverrides?.get(selectedMatch.id) ?? defaultArena;
    onMatchArenaChange?.(selectedMatch.id, currentArena, arenaNum, selectedMatch.fencerA, selectedMatch.fencerB);
    closeArenaModal();
  };

  return (
  <div>
    {/* Prochain match en gros */}
    {orderedMatches.pending.length > 0 &&
      (() => {
        const nextMatch = orderedMatches.pending[0];
        const fencerAAbandoned =
          nextMatch.match.fencerA?.status === FencerStatus.ABANDONED ||
          nextMatch.match.fencerA?.status === FencerStatus.FORFAIT ||
          nextMatch.match.fencerA?.status === FencerStatus.EXCLUDED;
        const fencerBAbandoned =
          nextMatch.match.fencerB?.status === FencerStatus.ABANDONED ||
          nextMatch.match.fencerB?.status === FencerStatus.FORFAIT ||
          nextMatch.match.fencerB?.status === FencerStatus.EXCLUDED;
        const isAbandonMatch = fencerAAbandoned || fencerBAbandoned;

        if (isAbandonMatch) {
          return (
            <div
              style={{
                background: '#6b7280',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1rem',
                color: 'white',
                opacity: 0.7,
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  opacity: 0.8,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>✕ Match non disputé</span>
              </div>
              <div
                style={ROW_BETWEEN}
              >
                <div style={CELL_CENTER}>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      textDecoration: fencerAAbandoned ? 'line-through' : 'none',
                    }}
                  >
                    {nextMatch.match.fencerA?.lastName}
                    {fencerAAbandoned && ' ✕'}
                  </div>
                  <div style={SUB_TEXT}>
                    {nextMatch.match.fencerA?.firstName}
                  </div>
                </div>
                <div style={VS_SEP}>
                  vs
                </div>
                <div style={CELL_CENTER}>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      textDecoration: fencerBAbandoned ? 'line-through' : 'none',
                    }}
                  >
                    {nextMatch.match.fencerB?.lastName}
                    {fencerBAbandoned && ' ✕'}
                  </div>
                  <div style={SUB_TEXT}>
                    {nextMatch.match.fencerB?.firstName}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1rem',
              color: 'white',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                opacity: 0.8,
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>⚔️ Prochain match</span>
              <ArenaBadge
                match={nextMatch.match}
                defaultArena={defaultArena}
                matchArenaOverrides={matchArenaOverrides}
                isRemoteActive={isRemoteActive}
                arenaCount={arenaCount}
                dark
                onClick={e => openArenaModal(nextMatch.match, e)}
              />
            </div>
            <div
              style={ROW_BETWEEN}
            >
              <div style={CELL_CENTER}>
                <div style={NAME_BIG}>
                  {orderedMatches.pending[0].match.fencerA?.lastName}
                </div>
                <div style={SUB_TEXT}>
                  {orderedMatches.pending[0].match.fencerA?.firstName}
                </div>
              </div>
              <div style={VS_SEP}>VS</div>
              <div style={CELL_CENTER}>
                <div style={NAME_BIG}>
                  {orderedMatches.pending[0].match.fencerB?.lastName}
                </div>
                <div style={SUB_TEXT}>
                  {orderedMatches.pending[0].match.fencerB?.firstName}
                </div>
              </div>
            </div>
            <button
              onClick={() => openScoreModal(orderedMatches.pending[0].index)}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              🎯 Saisir le score
            </button>
          </div>
        );
      })()}

    {/* Matches restants */}
    {orderedMatches.pending.length > 1 && (
      <div style={{ marginBottom: '1rem' }}>
        <h4
          style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#6b7280',
          }}
        >
          Matches à venir ({orderedMatches.pending.length - 1})
        </h4>
        <div style={COL_GAP}>
          {orderedMatches.pending.slice(1).map(({ match, index }, i) => {
            const fencerAAbandoned =
              match.fencerA?.status === FencerStatus.ABANDONED ||
              match.fencerA?.status === FencerStatus.FORFAIT ||
              match.fencerA?.status === FencerStatus.EXCLUDED;
            const fencerBAbandoned =
              match.fencerB?.status === FencerStatus.ABANDONED ||
              match.fencerB?.status === FencerStatus.FORFAIT ||
              match.fencerB?.status === FencerStatus.EXCLUDED;
            const isAbandonMatch = fencerAAbandoned || fencerBAbandoned;

            return (
              <div
                key={index}
                onClick={() => !isAbandonMatch && openScoreModal(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: isAbandonMatch ? '#e5e7eb' : '#f9fafb',
                  borderRadius: '6px',
                  cursor: isAbandonMatch ? 'not-allowed' : 'pointer',
                  border: isAbandonMatch ? '1px dashed #9ca3af' : '1px solid #e5e7eb',
                  opacity: isAbandonMatch ? 0.5 : 1,
                  gap: '0.5rem',
                }}
              >
                <span style={NUM_BADGE}>
                  #{i + 2}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontWeight: '500',
                    textDecoration: fencerAAbandoned ? 'line-through' : 'none',
                    color: fencerAAbandoned ? '#9ca3af' : 'inherit',
                  }}
                >
                  {match.fencerA?.lastName}
                  {fencerAAbandoned && ' ✕'}
                </span>
                <span style={{ color: '#9ca3af', padding: '0 0.5rem' }}>
                  {isAbandonMatch ? '✕' : 'vs'}
                </span>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'right',
                    fontWeight: '500',
                    textDecoration: fencerBAbandoned ? 'line-through' : 'none',
                    color: fencerBAbandoned ? '#9ca3af' : 'inherit',
                  }}
                >
                  {match.fencerB?.lastName}
                  {fencerBAbandoned && ' ✕'}
                </span>
                <ArenaBadge
                  match={match}
                  defaultArena={defaultArena}
                  matchArenaOverrides={matchArenaOverrides}
                  isRemoteActive={isRemoteActive}
                  arenaCount={arenaCount}
                  onClick={e => openArenaModal(match, e)}
                />
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Matches terminés */}
    {orderedMatches.finished.length > 0 && (
      <div>
        <h4
          style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#6b7280',
          }}
        >
          Matches terminés ({orderedMatches.finished.length})
        </h4>
        <div style={COL_GAP}>
          {orderedMatches.finished.map(({ match, index }) => {
            const fencerAAbandoned =
              match.fencerA?.status === FencerStatus.ABANDONED ||
              match.fencerA?.status === FencerStatus.FORFAIT ||
              match.fencerA?.status === FencerStatus.EXCLUDED;
            const fencerBAbandoned =
              match.fencerB?.status === FencerStatus.ABANDONED ||
              match.fencerB?.status === FencerStatus.FORFAIT ||
              match.fencerB?.status === FencerStatus.EXCLUDED;
            const isAbandonMatch = fencerAAbandoned || fencerBAbandoned;

            return (
              <div
                key={index}
                onClick={() => !isAbandonMatch && !isLocked && openScoreModal(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: isAbandonMatch
                    ? '#e5e7eb'
                    : match.scoreA?.isVictory
                      ? '#f0fdf4'
                      : '#fef2f2',
                  borderRadius: '6px',
                  cursor: isAbandonMatch || isLocked ? 'not-allowed' : 'pointer',
                  border: isAbandonMatch ? '1px dashed #9ca3af' : '1px solid #e5e7eb',
                  opacity: isAbandonMatch ? 0.5 : 1,
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontWeight: match.scoreA?.isVictory ? '600' : '400',
                    color: isAbandonMatch
                      ? '#9ca3af'
                      : match.scoreA?.isVictory
                        ? '#16a34a'
                        : '#6b7280',
                    textDecoration: fencerAAbandoned ? 'line-through' : 'none',
                  }}
                >
                  {match.scoreA?.isVictory ? '✓ ' : ''}
                  {match.fencerA?.lastName}
                  {fencerAAbandoned && ' ✕'}
                </span>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: isAbandonMatch ? '#e5e7eb' : 'white',
                    borderRadius: '4px',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    color: isAbandonMatch ? '#9ca3af' : 'inherit',
                  }}
                >
                  {isAbandonMatch ? (
                    '✕ Non disputé'
                  ) : (
                    <>
                      {match.scoreA?.isVictory ? 'V' : ''}
                      {match.scoreA?.value} - {match.scoreB?.isVictory ? 'V' : ''}
                      {match.scoreB?.value}
                    </>
                  )}
                </span>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'right',
                    fontWeight: match.scoreB?.isVictory ? '600' : '400',
                    color: isAbandonMatch
                      ? '#9ca3af'
                      : match.scoreB?.isVictory
                        ? '#16a34a'
                        : '#6b7280',
                    textDecoration: fencerBAbandoned ? 'line-through' : 'none',
                  }}
                >
                  {match.fencerB?.lastName}
                  {fencerBAbandoned && ' ✕'}
                  {match.scoreB?.isVictory && !isAbandonMatch ? ' ✓' : ''}
                </span>
                {onShowMatchAudit && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onShowMatchAudit(match.id);
                    }}
                    title="Journal du match"
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#7c3aed',
                      flexShrink: 0,
                    }}
                  >
                    📋
                  </button>
                )}
                {!isAbandonMatch && !isLocked && onMatchReset && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onMatchReset(index);
                    }}
                    title="Annuler ce résultat"
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#dc2626',
                      flexShrink: 0,
                    }}
                  >
                    ↺
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Matches annulés */}
    {orderedMatches.cancelled.length > 0 && (
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={SECTION_TITLE}>
          Matches annulés ({orderedMatches.cancelled.length})
        </h4>
        <div style={COL_GAP}>
          {orderedMatches.cancelled.map(({ match, index }) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: '#f3f4f6',
                borderRadius: '6px',
                border: '1px dashed #d1d5db',
                opacity: 0.8,
              }}
            >
              <span style={{ color: '#9ca3af', fontSize: '0.875rem', minWidth: '30px' }}>⏸</span>
              <span style={{ flex: 1, textAlign: 'center', color: '#6b7280', textDecoration: 'line-through' }}>
                {match.fencerA?.lastName} vs {match.fencerB?.lastName}
              </span>
              {!isLocked && onMatchReset && (
                <button
                  onClick={() => onMatchReset(index)}
                  title="Relancer ce match"
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#2563eb',
                    flexShrink: 0,
                  }}
                >
                  ▶ Relancer
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Poule terminée */}
    {orderedMatches.pending.length === 0 && orderedMatches.cancelled.length === 0 && (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏁</div>
        <div style={{ fontWeight: '600' }}>Poule terminée !</div>
        <div style={{ fontSize: '0.875rem' }}>Tous les matches ont été joués</div>
      </div>
    )}

    {/* Modal d'assignation de piste */}
    {showArenaModal && selectedMatch && (
      <div className="modal-overlay" onClick={closeArenaModal}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
          <div className="modal-header">
            <h3 className="modal-title">Assigner à une piste</h3>
            <button className="btn-close" onClick={closeArenaModal}>&times;</button>
          </div>
          <div className="modal-body" style={{ padding: '1.5rem' }}>
            <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
              Sélectionnez la piste pour ce match :
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              <button
                className={`btn ${!matchArenaOverrides?.has(selectedMatch.id) ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleAssignArena(null)}
                style={{ padding: '0.75rem', gridColumn: '1 / -1', fontSize: '0.875rem' }}
              >
                ↩ Piste par défaut (Piste {defaultArena})
              </button>
              {Array.from({ length: arenaCount }, (_, i) => i + 1).map(arenaNum => {
                const arenaObj = arenas.find(a => a.number === arenaNum);
                const isCurrentArena = (matchArenaOverrides?.get(selectedMatch.id) ?? defaultArena) === arenaNum;
                const statusIcon = arenaObj
                  ? arenaObj.status === 'in_progress'
                    ? ' ●'
                    : arenaObj.status === 'ready'
                      ? ' ○'
                      : ''
                  : '';
                return (
                  <button
                    key={arenaNum}
                    className={`btn ${isCurrentArena ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleAssignArena(arenaNum)}
                    style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                  >
                    Piste {arenaNum}{statusIcon}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

const PoolMatchList = React.memo(PoolMatchListComponent);
export default PoolMatchList;
