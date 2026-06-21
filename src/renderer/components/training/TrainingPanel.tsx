import React, { useEffect, useState, useCallback } from 'react';
import { X, Swords, Wifi, Clock, Trophy } from 'lucide-react';
import type { TrainingMatchRecord } from '../../../shared/types/preload';

const WEAPON_LABELS: Record<string, string> = {
  E: 'Épée', F: 'Fleuret', S: 'Sabre', L: 'Laser', C: 'Custom',
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  serverUrl: string;
  strips: number;
  weapon: string;
  onStop: () => void;
}

const TrainingPanel: React.FC<Props> = ({ serverUrl, strips, weapon, onStop }) => {
  const [history, setHistory] = useState<TrainingMatchRecord[]>([]);

  const refreshHistory = useCallback(async () => {
    const result = await window.electronAPI?.training?.getHistory();
    if (result?.success) setHistory(result.history ?? []);
  }, []);

  useEffect(() => {
    refreshHistory();
    const unsub = window.electronAPI?.onTrainingMatchFinished?.((data) => {
      const record = data?.record;
      if (record) setHistory(prev => [...prev, record]);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [refreshHistory]);

  const arenaUrls = Array.from({ length: strips }, (_, i) => ({
    number: i + 1,
    referee: `${serverUrl}/arene${i + 1}/arbitre`,
    display: `${serverUrl}/arene${i + 1}`,
  }));

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-xl)',
          width: '580px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--color-text)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Swords size={18} />
            Entraînement — {WEAPON_LABELS[weapon] ?? weapon}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              background: '#22c55e20', color: '#16a34a',
              padding: '0.125rem 0.5rem', borderRadius: '999px',
              fontSize: '0.75rem', fontWeight: 600, marginLeft: '0.25rem',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              EN COURS
            </span>
          </h2>
          <button className="btn btn-icon" onClick={onStop} title="Arrêter l'entraînement"><X size={16} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Pistes */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Wifi size={13} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
              Pistes — {strips} piste{strips > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {arenaUrls.map(({ number, referee, display }) => (
                <div key={number} style={{
                  background: 'var(--color-surface-raised, rgba(0,0,0,0.04))',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: '5rem' }}>Piste {number}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Arbitre : <code style={{ fontSize: '0.75rem' }}>{referee}</code>
                  </span>
                  <a
                    href={display}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    Affichage ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Historique */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Trophy size={13} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
              Historique session ({history.length} combat{history.length !== 1 ? 's' : ''})
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: '0.75rem', textAlign: 'center', background: 'var(--color-surface-raised, rgba(0,0,0,0.04))', borderRadius: '8px' }}>
                Aucun combat terminé
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '220px', overflowY: 'auto' }}>
                {[...history].reverse().map((rec, idx) => (
                  <div key={rec.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.375rem 0.75rem',
                    background: idx % 2 === 0 ? 'var(--color-surface-raised, rgba(0,0,0,0.03))' : 'transparent',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}>
                    <span style={{ minWidth: '4rem', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                      Piste {rec.arenaNumber}
                    </span>
                    <span style={{ flex: 1, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {rec.scoreA} — {rec.scoreB}
                    </span>
                    {rec.durationSec > 0 && (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={11} /> {formatDuration(rec.durationSec)}
                      </span>
                    )}
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                      {new Date(rec.finishedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button className="btn btn-danger" onClick={onStop}>
            Arrêter l'entraînement
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingPanel;
