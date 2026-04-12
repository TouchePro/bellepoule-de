/**
 * BellePoule Modern - Touch-Optimized Tablet Interface for Referees
 * Enhanced remote scoring interface with touch optimization
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Fencer, Match, MatchStatus, TargetZone } from '../../shared/types';

interface TouchOptimizedRefereeProps {
  match: Match;
  fencerA: Fencer;
  fencerB: Fencer;
  maxScore: number;
  onScoreUpdate: (scoreA: number, scoreB: number) => void;
  onMatchEnd: () => void;
  onVoiceCommand?: (command: string) => void;
}

const ZONES = [
  { zone: TargetZone.ZONE_A, points: 1, label: 'A', desc: 'Main', color: 'bg-blue-500' },
  { zone: TargetZone.ZONE_B, points: 3, label: 'B', desc: 'Bras', color: 'bg-purple-500' },
  { zone: TargetZone.ZONE_C, points: 5, label: 'C', desc: 'Tête', color: 'bg-pink-500' },
];

export const TouchOptimizedReferee: React.FC<TouchOptimizedRefereeProps> = ({
  match,
  fencerA,
  fencerB,
  maxScore,
  onScoreUpdate,
  onMatchEnd,
  onVoiceCommand,
}) => {
  const [scoreA, setScoreA] = useState(match.scoreA?.value || 0);
  const [scoreB, setScoreB] = useState(match.scoreB?.value || 0);
  const [matchTime, setMatchTime] = useState(0);
  const [isRunning, setIsRunning] = useState(match.status === MatchStatus.IN_PROGRESS);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Timer management
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setMatchTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = Math.abs(touchEnd.y - touchStartRef.current.y);

    // Horizontal swipe detected (more horizontal than vertical)
    if (Math.abs(deltaX) > 50 && deltaY < 100) {
      if (deltaX > 0) {
        setSwipeDirection('right');
        handleScoreIncrement('B');
      } else {
        setSwipeDirection('left');
        handleScoreIncrement('A');
      }

      setTimeout(() => setSwipeDirection(null), 300);
    }

    touchStartRef.current = null;
  }, []);

  // Voice recognition
  useEffect(() => {
    if (!voiceEnabled || !onVoiceCommand) return;

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase();

      onVoiceCommand(command);
      processVoiceCommand(command);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.start();
    }

    return () => {
      recognition.stop();
    };
  }, [voiceEnabled, isListening, onVoiceCommand]);

  const processVoiceCommand = (command: string) => {
    // Simple voice commands
    if (command.includes('point') || command.includes('touche')) {
      if (command.includes('vert') || command.includes('a')) {
        handleScoreIncrement('A');
      } else if (command.includes('rouge') || command.includes('b')) {
        handleScoreIncrement('B');
      }
    } else if (command.includes('annuler')) {
      handleScoreDecrement('A');
      handleScoreDecrement('B');
    } else if (command.includes('terminer') || command.includes('fin')) {
      handleMatchEnd();
    } else if (command.includes('pause') || command.includes('arrêter')) {
      setIsRunning(false);
    } else if (command.includes('reprendre') || command.includes('continuer')) {
      setIsRunning(true);
    }
  };

  const handleScoreIncrement = (fencer: 'A' | 'B', points: number = 1) => {
    if (fencer === 'A') {
      const newScore = Math.min(scoreA + points, maxScore);
      setScoreA(newScore);
      onScoreUpdate(newScore, scoreB);

      if (newScore >= maxScore) {
        handleMatchEnd();
      }
    } else {
      const newScore = Math.min(scoreB + points, maxScore);
      setScoreB(newScore);
      onScoreUpdate(scoreA, newScore);

      if (newScore >= maxScore) {
        handleMatchEnd();
      }
    }
  };

  const handleZoneScore = (fencer: 'A' | 'B', zone: TargetZone, points: number) => {
    handleScoreIncrement(fencer, points);
  };

  const handleScoreDecrement = (fencer: 'A' | 'B') => {
    if (fencer === 'A') {
      const newScore = Math.max(scoreA - 1, 0);
      setScoreA(newScore);
      onScoreUpdate(newScore, scoreB);
    } else {
      const newScore = Math.max(scoreB - 1, 0);
      setScoreB(newScore);
      onScoreUpdate(scoreA, newScore);
    }
  };

  const handleMatchEnd = () => {
    setIsRunning(false);
    onMatchEnd();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSwipeAnimation = () => {
    if (!swipeDirection) return '';
    return swipeDirection === 'left' ? 'animate-swipe-left' : 'animate-swipe-right';
  };

  return (
    <div
      className="touch-referee-interface h-screen bg-gray-100 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-800">Piste {match.number || 1}</div>
          <div className="flex items-center space-x-4">
            <div className="text-xl font-mono">{formatTime(matchTime)}</div>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-4 py-2 rounded-lg font-medium ${
                isRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              }`}
            >
              {isRunning ? 'PAUSE' : 'START'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Score Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Fencers */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Fencer A */}
            <div className={`text-center ${getSwipeAnimation()}`}>
              <div className="bg-green-500 text-white rounded-lg p-6 mb-4">
                <div className="text-lg font-medium">
                  {fencerA.firstName} {fencerA.lastName}
                </div>
                <div className="text-sm opacity-75">N°{fencerA.ref}</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-6xl font-bold text-gray-800 mb-4">{scoreA}</div>
                {/* Zone buttons for Sabre Laser */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {ZONES.map(({ zone, points, label, desc, color }) => (
                    <button
                      key={zone}
                      onClick={() => handleZoneScore('A', zone, points)}
                      className={`${color} text-white rounded-lg p-3 flex flex-col items-center active:scale-95 transition-transform min-h-[80px]`}
                    >
                      <span className="text-2xl font-bold">{label}</span>
                      <span className="text-lg font-medium">+{points}</span>
                      <span className="text-xs opacity-80">{desc}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => handleScoreDecrement('A')}
                    className="w-16 h-16 bg-gray-300 text-gray-700 rounded-full text-2xl font-bold active:scale-95 transition-transform"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => {
                      setScoreA(0);
                      onScoreUpdate(0, scoreB);
                    }}
                    className="w-16 h-16 bg-red-500 text-white rounded-full text-xl font-bold active:scale-95 transition-transform"
                  >
                    0
                  </button>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">
                Glisser vers la gauche ou toucher +1 pour ajouter un point
              </div>
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className="text-3xl font-bold text-gray-400">VS</div>
            </div>

            {/* Fencer B */}
            <div className={`text-center ${getSwipeAnimation()}`}>
              <div className="bg-red-500 text-white rounded-lg p-6 mb-4">
                <div className="text-lg font-medium">
                  {fencerB.firstName} {fencerB.lastName}
                </div>
                <div className="text-sm opacity-75">N°{fencerB.ref}</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-6xl font-bold text-gray-800 mb-4">{scoreB}</div>
                {/* Zone buttons for Sabre Laser */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {ZONES.map(({ zone, points, label, desc, color }) => (
                    <button
                      key={zone}
                      onClick={() => handleZoneScore('B', zone, points)}
                      className={`${color} text-white rounded-lg p-3 flex flex-col items-center active:scale-95 transition-transform min-h-[80px]`}
                    >
                      <span className="text-2xl font-bold">{label}</span>
                      <span className="text-lg font-medium">+{points}</span>
                      <span className="text-xs opacity-80">{desc}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => handleScoreDecrement('B')}
                    className="w-16 h-16 bg-gray-300 text-gray-700 rounded-full text-2xl font-bold active:scale-95 transition-transform"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => {
                      setScoreB(0);
                      onScoreUpdate(scoreA, 0);
                    }}
                    className="w-16 h-16 bg-red-500 text-white rounded-full text-xl font-bold active:scale-95 transition-transform"
                  >
                    0
                  </button>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">
                Glisser vers la droite ou toucher +1 pour ajouter un point
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg p-4 mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                {scoreA} / {maxScore}
              </span>
              <span>Premier à {maxScore} points</span>
              <span>
                {scoreB} / {maxScore}
              </span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full flex" style={{ width: '100%' }}>
                <div
                  className="bg-red-500 transition-all duration-300"
                  style={{ width: `${(scoreA / maxScore) * 100}%` }}
                />
                <div
                  className="bg-green-500 transition-all duration-300"
                  style={{ width: `${(scoreB / maxScore) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setScoreA(0);
                setScoreB(0);
                onScoreUpdate(0, 0);
              }}
              className="bg-yellow-500 text-white px-6 py-4 rounded-lg font-medium text-lg active:scale-95 transition-transform"
            >
              Réinitialiser Score
            </button>
            <button
              onClick={handleMatchEnd}
              className="bg-blue-500 text-white px-6 py-4 rounded-lg font-medium text-lg active:scale-95 transition-transform"
            >
              Terminer Match
            </button>
          </div>
        </div>
      </div>

      {/* Voice Control Footer */}
      <div className="bg-white shadow-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (!voiceEnabled) {
                  setIsListening(true);
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                voiceEnabled ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
              }`}
            >
              🎤 {voiceEnabled ? 'Actif' : 'Inactif'}
            </button>
            {isListening && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-600">Écoute...</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Commandes: "Point rouge/vert", "Pause", "Reprendre", "Terminer"
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes swipe-left {
          0% { transform: translateX(0); }
          50% { transform: translateX(-20px); }
          100% { transform: translateX(0); }
        }
        
        @keyframes swipe-right {
          0% { transform: translateX(0); }
          50% { transform: translateX(20px); }
          100% { transform: translateX(0); }
        }
        
        .animate-swipe-left {
          animation: swipe-left 0.3s ease-out;
        }
        
        .animate-swipe-right {
          animation: swipe-right 0.3s ease-out;
        }
      `,
        }}
      />
    </div>
  );
};
