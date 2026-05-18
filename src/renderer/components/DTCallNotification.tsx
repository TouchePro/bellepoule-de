/**
 * BellePoule Modern - DT Call Notification
 * Persistent alert panel shown when a referee requests DT intervention
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback } from 'react';

interface DTCallEntry {
  id: string;
  arenaId: string;
  arenaNumber: number;
  matchNumber: number | null;
  competitionId: string | null;
  timestamp: number;
  acknowledging: boolean;
}

const DTCallNotification: React.FC = () => {
  const [calls, setCalls] = useState<DTCallEntry[]>([]);

  useEffect(() => {
    if (!window.electronAPI?.onDTCall) return;
    const unsub = window.electronAPI.onDTCall((data) => {
      setCalls(prev => {
        // remplacer un appel existant pour la même arène
        const filtered = prev.filter(c => c.arenaId !== data.arenaId);
        return [...filtered, {
          id: `${data.arenaId}-${data.timestamp}`,
          arenaId: data.arenaId,
          arenaNumber: data.arenaNumber,
          matchNumber: data.matchNumber,
          competitionId: data.competitionId,
          timestamp: data.timestamp,
          acknowledging: false,
        }];
      });
      // Alerte sonore
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch {
        // AudioContext non disponible
      }
    });
    return unsub;
  }, []);

  const acknowledge = useCallback(async (call: DTCallEntry) => {
    setCalls(prev => prev.map(c => c.id === call.id ? { ...c, acknowledging: true } : c));
    if (call.competitionId) {
      await window.electronAPI.remote.acknowledgeDTCall(call.competitionId, call.arenaId);
    }
    setCalls(prev => prev.filter(c => c.id !== call.id));
  }, []);

  if (calls.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 10001,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '340px',
    }}>
      {calls.map(call => (
        <div key={call.id} style={{
          backgroundColor: '#1f2937',
          borderLeft: '4px solid #f97316',
          borderRadius: '8px',
          padding: '14px 16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          color: '#f9fafb',
          animation: 'slideInRight 0.3s ease-out',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
            📣 Appel DT — Piste {call.arenaNumber}
          </div>
          {call.matchNumber != null && (
            <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '4px' }}>
              Match n° {call.matchNumber}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
            {new Date(call.timestamp).toLocaleTimeString()}
          </div>
          <button
            onClick={() => acknowledge(call)}
            disabled={call.acknowledging}
            style={{
              backgroundColor: call.acknowledging ? '#374151' : '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              cursor: call.acknowledging ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              width: '100%',
            }}
          >
            {call.acknowledging ? '⏳ En cours...' : '✅ DT en route — Résolu'}
          </button>
        </div>
      ))}
    </div>
  );
};

export default DTCallNotification;
