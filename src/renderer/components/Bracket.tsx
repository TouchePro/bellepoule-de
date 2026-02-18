/**
 * BellePoule Modern - Interactive Bracket Component
 * SVG-based tournament bracket visualization
 * Licensed under GPL-3.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Fencer } from '../../shared/types';

interface BracketMatch {
  id: string;
  round: number;
  position: number;
  fencerA: Fencer | null;
  fencerB: Fencer | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId?: string;
  isBye?: boolean;
}

interface BracketProps {
  matches: BracketMatch[];
  tableSize: number;
  onMatchClick?: (match: BracketMatch) => void;
  onScoreUpdate?: (matchId: string, scoreA: number, scoreB: number) => void;
  thirdPlaceMatch?: boolean;
  className?: string;
}

interface MatchPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MATCH_WIDTH = 200;
const MATCH_HEIGHT = 60;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 40;

const Bracket: React.FC<BracketProps> = ({
  matches,
  tableSize,
  onMatchClick,
  onScoreUpdate,
  thirdPlaceMatch = false,
  className = '',
}) => {
  const [hoveredMatch, setHoveredMatch] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);

  const rounds = useMemo(() => {
    const roundMap = new Map<number, BracketMatch[]>();
    matches.forEach(match => {
      if (!roundMap.has(match.round)) {
        roundMap.set(match.round, []);
      }
      roundMap.get(match.round)!.push(match);
    });
    return roundMap;
  }, [matches]);

  const maxRound = Math.max(...Array.from(rounds.keys()));
  const svgWidth = (maxRound + 1) * (MATCH_WIDTH + HORIZONTAL_GAP) + 100;
  const matchesPerRound = tableSize / 2;
  const svgHeight = Math.max(400, matchesPerRound * (MATCH_HEIGHT + VERTICAL_GAP) + 100);

  const calculateMatchPosition = useCallback(
    (round: number, position: number): MatchPosition => {
      const matchesInRound = rounds.get(round)?.length || 0;
      const baseY = svgHeight / 2;
      const roundSpacing = (MATCH_HEIGHT + VERTICAL_GAP) * Math.pow(2, round - 1);

      let yOffset = 0;
      if (matchesInRound > 1) {
        const index = position - 1;
        const totalHeight = (matchesInRound - 1) * roundSpacing;
        yOffset = -totalHeight / 2 + index * roundSpacing;
      }

      return {
        x: 50 + (maxRound - round) * (MATCH_WIDTH + HORIZONTAL_GAP),
        y: baseY + yOffset,
        width: MATCH_WIDTH,
        height: MATCH_HEIGHT,
      };
    },
    [rounds, maxRound, svgHeight]
  );

  const renderFencerBox = (
    fencer: Fencer | null,
    score: number | null,
    isWinner: boolean,
    isTop: boolean
  ) => {
    const bgColor = isWinner ? '#d4edda' : fencer ? '#f8f9fa' : '#e9ecef';
    const textColor = fencer ? '#212529' : '#6c757d';
    const borderColor = isWinner ? '#28a745' : '#dee2e6';

    return (
      <g>
        <rect
          x={0}
          y={isTop ? 0 : MATCH_HEIGHT / 2}
          width={MATCH_WIDTH - 40}
          height={MATCH_HEIGHT / 2}
          fill={bgColor}
          stroke={borderColor}
          strokeWidth={1}
        />
        <text
          x={10}
          y={isTop ? MATCH_HEIGHT / 4 + 4 : (MATCH_HEIGHT * 3) / 4 + 4}
          fill={textColor}
          fontSize={12}
          fontWeight={isWinner ? 'bold' : 'normal'}
        >
          {fencer ? `${fencer.lastName} ${fencer.firstName.charAt(0)}.` : 'TBD'}
        </text>
        <rect
          x={MATCH_WIDTH - 40}
          y={isTop ? 0 : MATCH_HEIGHT / 2}
          width={40}
          height={MATCH_HEIGHT / 2}
          fill={bgColor}
          stroke={borderColor}
          strokeWidth={1}
        />
        <text
          x={MATCH_WIDTH - 20}
          y={isTop ? MATCH_HEIGHT / 4 + 4 : (MATCH_HEIGHT * 3) / 4 + 4}
          fill={textColor}
          fontSize={14}
          fontWeight="bold"
          textAnchor="middle"
        >
          {score !== null ? score : '-'}
        </text>
      </g>
    );
  };

  const renderConnectionLines = (match: BracketMatch, pos: MatchPosition) => {
    if (match.round <= 1) return null;

    const parentRound = match.round - 1;
    const parentPositionA = match.position * 2 - 1;
    const parentPositionB = match.position * 2;

    const parentPosA = calculateMatchPosition(parentRound, parentPositionA);
    const parentPosB = calculateMatchPosition(parentRound, parentPositionB);

    return (
      <g>
        {/* Line from parent A */}
        <path
          d={`M ${parentPosA.x + MATCH_WIDTH} ${parentPosA.y + MATCH_HEIGHT / 2} 
              L ${pos.x} ${pos.y + MATCH_HEIGHT / 2}`}
          stroke="#adb5bd"
          strokeWidth={2}
          fill="none"
        />
        {/* Line from parent B */}
        <path
          d={`M ${parentPosB.x + MATCH_WIDTH} ${parentPosB.y + MATCH_HEIGHT / 2} 
              L ${pos.x} ${pos.y + MATCH_HEIGHT / 2}`}
          stroke="#adb5bd"
          strokeWidth={2}
          fill="none"
        />
      </g>
    );
  };

  const handleMatchClick = (match: BracketMatch) => {
    if (match.fencerA && match.fencerB && !match.isBye) {
      setEditingMatch(match.id);
      onMatchClick?.(match);
    }
  };

  return (
    <div className={`bracket-container ${className}`} style={{ overflow: 'auto' }}>
      <svg width={svgWidth} height={svgHeight} style={{ minWidth: svgWidth }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#adb5bd" />
          </marker>
        </defs>

        {/* Render connection lines first (behind matches) */}
        {matches.map(match => {
          const pos = calculateMatchPosition(match.round, match.position);
          return <g key={`line-${match.id}`}>{renderConnectionLines(match, pos)}</g>;
        })}

        {/* Render matches */}
        {matches.map(match => {
          const pos = calculateMatchPosition(match.round, match.position);
          const isHovered = hoveredMatch === match.id;
          const isEditing = editingMatch === match.id;
          const winner = match.winnerId;
          const isA = winner === match.fencerA?.id;
          const isB = winner === match.fencerB?.id;

          return (
            <g
              key={match.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{ cursor: match.isBye ? 'default' : 'pointer' }}
              onMouseEnter={() => setHoveredMatch(match.id)}
              onMouseLeave={() => setHoveredMatch(null)}
              onClick={() => handleMatchClick(match)}
            >
              {/* Match background */}
              <rect
                x={-5}
                y={-5}
                width={MATCH_WIDTH + 10}
                height={MATCH_HEIGHT + 10}
                fill={isHovered ? '#e3f2fd' : 'transparent'}
                stroke={isEditing ? '#2196f3' : 'transparent'}
                strokeWidth={2}
                rx={4}
              />

              {/* Bye indicator */}
              {match.isBye && (
                <text x={MATCH_WIDTH / 2} y={-10} textAnchor="middle" fill="#6c757d" fontSize={10}>
                  EXEMPT
                </text>
              )}

              {/* Fencer boxes */}
              {renderFencerBox(match.fencerA, match.scoreA, isA, true)}
              {renderFencerBox(match.fencerB, match.scoreB, isB, false)}

              {/* Round label for first round */}
              {match.round === 1 && (
                <text
                  x={MATCH_WIDTH / 2}
                  y={MATCH_HEIGHT + 20}
                  textAnchor="middle"
                  fill="#6c757d"
                  fontSize={10}
                >
                  {match.position <= tableSize / 4 ? `1/${tableSize / 2}` : 'Finale'}
                </text>
              )}
            </g>
          );
        })}

        {/* Round labels */}
        {Array.from(rounds.keys()).map(round => {
          const pos = calculateMatchPosition(round, 1);
          const roundNames: Record<number, string> = {
            1: 'Finale',
            2: 'Demi-finales',
            4: 'Quarts',
            8: '8èmes',
            16: '16èmes',
            32: '32èmes',
            64: '64èmes',
          };

          return (
            <text
              key={`label-${round}`}
              x={pos.x + MATCH_WIDTH / 2}
              y={30}
              textAnchor="middle"
              fill="#495057"
              fontSize={12}
              fontWeight="bold"
            >
              {roundNames[round] || `Tour ${round}`}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default React.memo(Bracket);
