import React from 'react';
import { TableauMatch } from '../TableauView';

interface MatchCardProps {
  match: TableauMatch;
  verticalPosition?: number;
  viewMode: 'full' | 'pending';
  baseMatchHeight: number;
  onMatchClick: (match: TableauMatch) => void;
  onArenaClick: (matchId: string) => void;
}

const BASE_MATCH_HEIGHT = 100;

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  verticalPosition,
  viewMode,
  baseMatchHeight,
  onMatchClick,
  onArenaClick,
}) => {
  const canEdit = !!(match.fencerA && match.fencerB && !match.isBye);
  const hasScore = match.scoreA !== null && match.scoreB !== null;
  const isMatchComplete = match.winner !== null;

  const handleArenaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArenaClick(match.id);
  };

  return (
    <div
      key={match.id}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        padding: '0.5rem',
        background: match.winner ? '#f0fdf4' : 'white',
        minWidth: '180px',
        cursor: canEdit ? 'pointer' : 'default',
        ...(verticalPosition !== undefined
          ? {
              position: 'absolute' as const,
              top: `${verticalPosition}px`,
              left: 0,
              right: 0,
              height: `${BASE_MATCH_HEIGHT}px`,
              overflow: 'hidden',
            }
          : { position: 'relative' as const, marginBottom: '0.25rem' }),
      }}
      onClick={() => {
        if (canEdit) onMatchClick(match);
      }}
    >
      {canEdit && !isMatchComplete && (
        <button
          onClick={handleArenaClick}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: match.arena ? '#10b981' : '#e5e7eb',
            color: match.arena ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '0.625rem',
            cursor: 'pointer',
            fontWeight: '500',
          }}
          title={match.arena ? `Piste ${match.arena}` : 'Assigner à une piste'}
        >
          {match.arena ? `P${match.arena}` : '+P'}
        </button>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0.25rem',
          background: match.winner === match.fencerA ? '#dcfce7' : 'transparent',
          borderRadius: '2px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: match.winner === match.fencerA ? '600' : '400',
            }}
          >
            {match.fencerA
              ? `${match.fencerA.lastName} ${match.fencerA.firstName.charAt(0)}.`
              : '-'}
          </span>
          {match.fencerA && (
            <span style={{ fontSize: '0.625rem', color: '#6b7280' }}>
              {match.fencerA.birthDate && `${new Date(match.fencerA.birthDate).getFullYear()}`}
              {match.fencerA.ranking && ` • #${match.fencerA.ranking}`}
            </span>
          )}
        </div>
        <span style={{ fontWeight: '600' }}>{match.scoreA !== null ? match.scoreA : ''}</span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0.25rem',
          background: match.winner === match.fencerB ? '#dcfce7' : 'transparent',
          borderRadius: '2px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: match.winner === match.fencerB ? '600' : '400',
            }}
          >
            {match.fencerB
              ? `${match.fencerB.lastName} ${match.fencerB.firstName.charAt(0)}.`
              : '-'}
          </span>
          {match.fencerB && (
            <span style={{ fontSize: '0.625rem', color: '#6b7280' }}>
              {match.fencerB.birthDate && `${new Date(match.fencerB.birthDate).getFullYear()}`}
              {match.fencerB.ranking && ` • #${match.fencerB.ranking}`}
            </span>
          )}
        </div>
        <span style={{ fontWeight: '600' }}>{match.scoreB !== null ? match.scoreB : ''}</span>
      </div>
      {match.isBye && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            textAlign: 'center',
            marginTop: '0.25rem',
          }}
        >
          Exempt
        </div>
      )}
      {canEdit && !hasScore && viewMode !== 'full' && (
        <div
          style={{
            width: '100%',
            marginTop: '0.5rem',
            padding: '0.25rem',
            fontSize: '0.75rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          Saisir score
        </div>
      )}
      {canEdit && hasScore && viewMode !== 'full' && (
        <div
          style={{
            width: '100%',
            marginTop: '0.5rem',
            padding: '0.25rem',
            fontSize: '0.75rem',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          Modifier score
        </div>
      )}
    </div>
  );
};

export default MatchCard;
