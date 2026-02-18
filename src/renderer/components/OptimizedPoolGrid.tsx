/**
 * BellePoule Modern - Optimized Pool Grid Component
 * Efficient rendering of pool results grid
 * Licensed under GPL-3.0
 */

import React, { memo } from 'react';
import { Fencer, Match, MatchStatus } from '../../shared/types';

interface PoolGridProps {
  fencers: Fencer[];
  matches: Match[];
  maxScore: number;
  onMatchClick: (match: Match) => void;
}

// Individual cell component - memoized to prevent unnecessary re-renders
const GridCell = memo(
  ({
    match,
    onClick,
    isDiagonal,
  }: {
    match: Match | null;
    onClick: () => void;
    isDiagonal: boolean;
  }) => {
    if (isDiagonal) {
      return (
        <td
          style={{
            backgroundColor: '#f3f4f6',
            textAlign: 'center',
            fontWeight: 'bold',
            border: '1px solid #d1d5db',
          }}
        >
          -
        </td>
      );
    }

    if (!match) {
      return (
        <td
          style={{
            backgroundColor: '#fafafa',
            textAlign: 'center',
            cursor: 'pointer',
            border: '1px solid #d1d5db',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#e5e7eb';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#fafafa';
          }}
          onClick={onClick}
        >
          -
        </td>
      );
    }

    const scoreA = match.scoreA?.value ?? 0;
    const scoreB = match.scoreB?.value ?? 0;
    const victoryA = match.scoreA?.isVictory;
    const victoryB = match.scoreB?.isVictory;
    const isFinished = match.status === 'finished';

    // Vérifier si un des tireurs est en forfait ou abandon
    const hasForfeitA =
      match.scoreA?.isForfait || match.fencerA?.status === 'F' || match.fencerA?.status === 'A';
    const hasForfeitB =
      match.scoreB?.isForfait || match.fencerB?.status === 'F' || match.fencerB?.status === 'A';
    const hasForfeitOrAbandon = hasForfeitA || hasForfeitB;

    let cellStyle: React.CSSProperties = {
      textAlign: 'center',
      cursor: 'pointer',
      border: '1px solid #d1d5db',
      fontWeight: 'bold',
    };

    // Si forfait/abandon : cellule grisée, non cliquable
    if (hasForfeitOrAbandon) {
      cellStyle.backgroundColor = '#d1d5db';
      cellStyle.color = '#6b7280';
      cellStyle.cursor = 'not-allowed';

      return (
        <td style={cellStyle} title="Match non disputé (forfait/abandon)">
          X
        </td>
      );
    }

    if (victoryA) {
      cellStyle.backgroundColor = '#dcfce7';
      cellStyle.color = '#166534';
    } else if (victoryB) {
      cellStyle.backgroundColor = '#dcfce7';
      cellStyle.color = '#166534';
    } else if (isFinished && scoreA > 0 && scoreB > 0) {
      cellStyle.backgroundColor = '#fef3c7';
    }

    const displayScore = victoryA ? 'V' : victoryB ? 'V' : `${scoreA}-${scoreB}`;

    return (
      <td style={cellStyle} onClick={onClick}>
        {displayScore}
      </td>
    );
  }
);

GridCell.displayName = 'GridCell';

// Header row component
const HeaderRow = memo(({ fencers }: { fencers: Fencer[] }) => (
  <tr>
    <th
      style={{
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '8px',
        border: '1px solid #374151',
        fontSize: '12px',
      }}
    >
      #
    </th>
    <th
      style={{
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '8px',
        border: '1px solid #374151',
        fontSize: '12px',
      }}
    >
      Tireur
    </th>
    {fencers.map(fencer => (
      <th
        key={fencer.id}
        style={{
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '4px',
          border: '1px solid #374151',
          fontSize: '10px',
          transform: 'rotate(-45deg)',
          transformOrigin: 'center',
          width: '30px',
          height: '30px',
        }}
      >
        {fencer.ref}
      </th>
    ))}
  </tr>
));

HeaderRow.displayName = 'HeaderRow';

// Fencer row component
const FencerRow = memo(
  ({
    fencer,
    rowIndex,
    fencerCount,
    matches,
    onMatchClick,
  }: {
    fencer: Fencer;
    rowIndex: number;
    fencerCount: number;
    matches: Match[];
    onMatchClick: (match: Match) => void;
  }) => {
    const getMatchForCell = (colIndex: number): Match | null => {
      const opponentFencer = fencerCount > colIndex ? null : fencer; // This needs to be fixed
      // Find match between fencer and column fencer
      return (
        matches.find(
          match =>
            (match.fencerA?.id === fencer.id && match.fencerB?.id === fencer.id) ||
            (match.fencerB?.id === fencer.id && match.fencerA?.id === fencer.id)
        ) || null
      );
    };

    return (
      <tr>
        <td
          style={{
            backgroundColor: '#f9fafb',
            textAlign: 'center',
            fontWeight: 'bold',
            border: '1px solid #d1d5db',
            padding: '8px',
          }}
        >
          {fencer.ref}
        </td>
        <td
          style={{
            backgroundColor: '#f9fafb',
            padding: '8px',
            border: '1px solid #d1d5db',
            fontSize: '12px',
            textAlign: 'left',
            whiteSpace: 'nowrap',
          }}
        >
          {fencer.firstName} {fencer.lastName}
        </td>
        {Array.from({ length: fencerCount }, (_, colIndex) => {
          const match = getMatchForCell(colIndex);
          const isDiagonal = rowIndex === colIndex;

          return (
            <GridCell
              key={`${fencer.id}-${colIndex}`}
              match={match}
              onClick={() => match && onMatchClick(match)}
              isDiagonal={isDiagonal}
            />
          );
        })}
      </tr>
    );
  }
);

FencerRow.displayName = 'FencerRow';

// Main pool grid component
export const PoolGrid: React.FC<PoolGridProps> = memo(
  ({ fencers, matches, maxScore, onMatchClick }) => {
    const createMatch = (fencerAId: string, fencerBId: string, index: number): Match => {
      // This should be replaced with proper match creation logic
      const fencerA = fencers.find(f => f.id === fencerAId);
      const fencerB = fencers.find(f => f.id === fencerBId);

      return {
        id: `temp-${fencerAId}-${fencerBId}`,
        number: index,
        fencerA: fencerA || null,
        fencerB: fencerB || null,
        scoreA: null,
        scoreB: null,
        maxScore,
        status: MatchStatus.NOT_STARTED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    const getMatchForCell = (fencerAId: string, fencerBId: string): Match | null => {
      return (
        matches.find(
          match =>
            (match.fencerA?.id === fencerAId && match.fencerB?.id === fencerBId) ||
            (match.fencerB?.id === fencerAId && match.fencerA?.id === fencerBId)
        ) || null
      );
    };

    return (
      <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            fontSize: '11px',
            minWidth: `${300 + fencers.length * 35}px`,
          }}
        >
          <thead>
            <HeaderRow fencers={fencers} />
          </thead>
          <tbody>
            {fencers.map((fencer, rowIndex) => (
              <FencerRow
                key={fencer.id}
                fencer={fencer}
                rowIndex={rowIndex}
                fencerCount={fencers.length}
                matches={matches}
                onMatchClick={onMatchClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

PoolGrid.displayName = 'PoolGrid';
