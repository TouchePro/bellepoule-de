/**
 * BellePoule Modern - Pool Match List Sub-component
 * Licensed under GPL-3.0
 */

import React from 'react';
import { Match, FencerStatus, MatchStatus } from '../../../shared/types';

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
}

const PoolMatchListComponent: React.FC<PoolMatchListProps> = ({
  orderedMatches,
  isLaserSabre: _isLaserSabre,
  isLocked,
  openScoreModal,
  onMatchReset,
}) => (
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
                }}
              >
                ✕ Match non disputé
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ flex: 1, textAlign: 'center' }}>
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
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    {nextMatch.match.fencerA?.firstName}
                  </div>
                </div>
                <div style={{ padding: '0 1rem', fontSize: '1.25rem', fontWeight: '600' }}>
                  vs
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
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
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
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
              }}
            >
              ⚔️ Prochain match
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                  {orderedMatches.pending[0].match.fencerA?.lastName}
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                  {orderedMatches.pending[0].match.fencerA?.firstName}
                </div>
              </div>
              <div style={{ padding: '0 1rem', fontSize: '1.25rem', fontWeight: '600' }}>VS</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                  {orderedMatches.pending[0].match.fencerB?.lastName}
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {orderedMatches.pending.slice(1).map(({ match, index }, i) => {
            // Vérifier si l'un des tireurs a abandonné
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
                }}
              >
                <span style={{ color: '#9ca3af', fontSize: '0.875rem', minWidth: '30px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {orderedMatches.finished.map(({ match, index }) => {
            // Vérifier si c'est un match avec abandon/forfait
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
        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>
          Matches annulés ({orderedMatches.cancelled.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
  </div>
);

const PoolMatchList = React.memo(PoolMatchListComponent);
export default PoolMatchList;
