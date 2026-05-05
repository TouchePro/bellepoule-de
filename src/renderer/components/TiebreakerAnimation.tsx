/**
 * BellePoule Modern - Tiebreaker Animation Component
 * Animated random draw to determine winner after sudden death overtime
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Fencer } from '../../shared/types';
import { drawWinner } from '../../shared/utils/suddenDeath';

interface TiebreakerAnimationProps {
  fencerA: Fencer;
  fencerB: Fencer;
  onComplete: (winner: 'A' | 'B') => void;
}

const TiebreakerAnimation: React.FC<TiebreakerAnimationProps> = ({
  fencerA,
  fencerB,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'shuffling' | 'revealing' | 'done'>('shuffling');
  const [highlighted, setHighlighted] = useState<'A' | 'B' | null>(null);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    const decided = drawWinner();
    setWinner(decided);

    // Shuffling phase: alternate between A and B rapidly
    let shuffleIndex = 0;
    const shuffleInterval = setInterval(() => {
      shuffleIndex++;
      setHighlighted(shuffleIndex % 2 === 0 ? 'A' : 'B');

      if (shuffleIndex > 20) {
        clearInterval(shuffleInterval);
        // Revealing phase: slow down then show winner
        setPhase('revealing');
        setTimeout(() => {
          setHighlighted(decided);
          setPhase('done');
        }, 500);
      }
    }, 100);

    return () => clearInterval(shuffleInterval);
  }, []);

  const handleContinue = useCallback(() => {
    if (winner) {
      onComplete(winner);
    }
  }, [winner, onComplete]);

  return (
    <div className="tiebreaker-overlay" onClick={e => e.stopPropagation()}>
      <div className="tiebreaker-container">
        <h2 className="tiebreaker-title">Tirage au sort</h2>
        <p className="tiebreaker-subtitle">Mort subite terminée - Egalite persistante</p>

        <div className="tiebreaker-fencers">
          <div
            className={`tiebreaker-fencer ${
              phase === 'done' && winner === 'A' ? 'winner' : ''
            } ${highlighted === 'A' ? 'highlighted' : ''}`}
          >
            <div className="fencer-avatar green">
              <span className="fencer-initials">
                {fencerA.firstName[0]}
                {fencerA.lastName[0]}
              </span>
            </div>
            <div className="fencer-name">
              {fencerA.lastName} {fencerA.firstName}
            </div>
            {phase === 'done' && winner === 'A' && <div className="winner-badge">VAINQUEUR</div>}
          </div>

          <div className="tiebreaker-vs">VS</div>

          <div
            className={`tiebreaker-fencer ${
              phase === 'done' && winner === 'B' ? 'winner' : ''
            } ${highlighted === 'B' ? 'highlighted' : ''}`}
          >
            <div className="fencer-avatar red">
              <span className="fencer-initials">
                {fencerB.firstName[0]}
                {fencerB.lastName[0]}
              </span>
            </div>
            <div className="fencer-name">
              {fencerB.lastName} {fencerB.firstName}
            </div>
            {phase === 'done' && winner === 'B' && <div className="winner-badge">VAINQUEUR</div>}
          </div>
        </div>

        {phase === 'done' && (
          <button className="btn btn-primary btn-continue" onClick={handleContinue}>
            Continuer
          </button>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .tiebreaker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease-out;
        }

        .tiebreaker-container {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          max-width: 600px;
          width: 90%;
          text-align: center;
          animation: scaleIn 0.4s ease-out;
        }

        .tiebreaker-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .tiebreaker-subtitle {
          color: #6b7280;
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        .tiebreaker-fencers {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .tiebreaker-fencer {
          flex: 1;
          padding: 1.5rem 1rem;
          border-radius: 12px;
          border: 3px solid #e5e7eb;
          transition: all 0.2s ease;
          min-width: 0;
        }

        .tiebreaker-fencer.highlighted {
          border-color: #fbbf24;
          background: #fef3c7;
          transform: scale(1.05);
        }

        .tiebreaker-fencer.winner {
          border-color: #22c55e;
          background: #f0fdf4;
          transform: scale(1.08);
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
        }

        .fencer-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          margin: 0 auto 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .fencer-avatar.green {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }

        .fencer-avatar.red {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .fencer-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #374151;
          word-break: break-word;
        }

        .tiebreaker-vs {
          font-size: 1.5rem;
          font-weight: 700;
          color: #9ca3af;
          flex-shrink: 0;
        }

        .winner-badge {
          margin-top: 0.75rem;
          background: #22c55e;
          color: white;
          padding: 0.35rem 1rem;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.85rem;
          display: inline-block;
          animation: pulse 1s ease-in-out infinite;
        }

        .btn-continue {
          padding: 0.75rem 2rem;
          font-size: 1.1rem;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `,
        }}
      />
    </div>
  );
};

export default TiebreakerAnimation;
