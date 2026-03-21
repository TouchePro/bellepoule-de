/**
 * BellePoule Modern - Kiosk Display Component
 * Affichage grand écran public avec menu auto-masquant
 * Vues : Poules / Classement provisoire / Tableau d'élimination
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Competition, Pool, Weapon, MatchStatus } from '../../shared/types';
import { TableauMatch } from './TableauView';
import {
  calculateOverallRanking,
  calculateOverallRankingQuest,
  formatRatio,
  formatIndex,
} from '../../shared/utils/poolCalculations';

type KioskView = 'pools' | 'ranking' | 'tableau';

const roundNames: Record<number, string> = {
  1: 'Finale',
  2: 'Demi-finales',
  4: 'Quarts de finale',
  8: '8èmes de finale',
  16: '16èmes de finale',
  32: '32èmes de finale',
  64: '64èmes de finale',
};

interface KioskDisplayProps {
  competition: Competition;
  pools: Pool[];
  weapon?: Weapon;
  tableauMatches: TableauMatch[];
  onClose: () => void;
}

const KioskDisplay: React.FC<KioskDisplayProps> = ({
  competition,
  pools,
  weapon,
  tableauMatches,
  onClose,
}) => {
  const isLaserSabre = weapon === 'L';

  // Déterminer la vue initiale selon les données disponibles
  const initialView = useMemo((): KioskView => {
    if (tableauMatches.length > 0) return 'tableau';
    const allDone = pools.length > 0 && pools.every(p =>
      p.matches.every(m => m.status === MatchStatus.FINISHED)
    );
    if (allDone) return 'ranking';
    return 'pools';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [currentView, setCurrentView] = useState<KioskView>(initialView);
  const [menuVisible, setMenuVisible] = useState(true);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotation poules
  const [currentPoolIndex, setCurrentPoolIndex] = useState(0);

  // Scroll refs pour ranking et tableau
  const rankingScrollRef = useRef<HTMLDivElement>(null);
  const tableauScrollRef = useRef<HTMLDivElement>(null);

  // Classement global
  const overallRanking = useMemo(() => {
    return isLaserSabre ? calculateOverallRankingQuest(pools) : calculateOverallRanking(pools);
  }, [pools, isLaserSabre]);

  // Round actif du tableau
  const activeRound = useMemo(() => {
    const incomplete = tableauMatches.filter(
      m => m.fencerA && m.fencerB && !m.winner && !m.isBye
    );
    if (incomplete.length === 0) return null;
    return Math.max(...incomplete.map(m => m.round));
  }, [tableauMatches]);

  const activeRoundMatches = useMemo(() => {
    if (activeRound === null) return [];
    return tableauMatches.filter(m => m.round === activeRound);
  }, [tableauMatches, activeRound]);

  // Champion (quand tableau terminé)
  const champion = useMemo(() => {
    if (activeRound !== null) return null;
    const finalMatch = tableauMatches.find(m => m.round === 1) ||
      tableauMatches.find(m => m.round === 2);
    return finalMatch?.winner ?? null;
  }, [tableauMatches, activeRound]);

  // Menu auto-masquant
  const showMenu = useCallback(() => {
    setMenuVisible(true);
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    menuTimerRef.current = setTimeout(() => setMenuVisible(false), 4000);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (currentView === 'pools') {
        if (e.key === 'ArrowRight') setCurrentPoolIndex(p => Math.min(p + 1, pools.length - 1));
        if (e.key === 'ArrowLeft') setCurrentPoolIndex(p => Math.max(p - 1, 0));
      }
      showMenu();
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousemove', showMenu);
    showMenu();
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousemove', showMenu);
      if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    };
  }, [onClose, showMenu, currentView, pools.length]);

  // Plein écran
  useEffect(() => {
    document.documentElement.requestFullscreen().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Rotation automatique poules (10s)
  useEffect(() => {
    if (currentView !== 'pools' || pools.length <= 1) return;
    const id = setInterval(() => {
      setCurrentPoolIndex(p => (p + 1) % pools.length);
    }, 10000);
    return () => clearInterval(id);
  }, [currentView, pools.length]);

  // Auto-scroll ranking
  useEffect(() => {
    if (currentView !== 'ranking') return;
    const el = rankingScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    let animId: number;
    let last: number | null = null;

    const step = (t: number) => {
      if (last !== null) {
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll > 0) {
          el.scrollTop += ((t - last) / 1000) * 40;
          if (el.scrollTop >= maxScroll) el.scrollTop = 0;
        }
      }
      last = t;
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [currentView, overallRanking]);

  // Auto-scroll tableau
  useEffect(() => {
    if (currentView !== 'tableau') return;
    const el = tableauScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    let animId: number;
    let last: number | null = null;

    const step = (t: number) => {
      if (last !== null) {
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll > 0) {
          el.scrollTop += ((t - last) / 1000) * 40;
          if (el.scrollTop >= maxScroll) el.scrollTop = 0;
        }
      }
      last = t;
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [currentView, activeRound]);

  // Données de la poule courante
  const currentPool = pools[currentPoolIndex];
  const poolCompleted = currentPool
    ? currentPool.matches.filter(m => m.status === MatchStatus.FINISHED).length
    : 0;
  const poolTotal = currentPool ? currentPool.matches.length : 0;
  const poolProgress = poolTotal > 0 ? (poolCompleted / poolTotal) * 100 : 0;

  const hasPoolData = pools.length > 0;
  const hasRankingData = overallRanking.length > 0;
  const hasTableauData = tableauMatches.length > 0;

  const btnStyle = (active: boolean, disabled: boolean) => ({
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: '0.95rem',
    background: active ? '#3b82f6' : disabled ? '#1e293b' : '#334155',
    color: disabled ? '#475569' : 'white',
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.2s',
  });

  return (
    <div
      onMouseMove={showMenu}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0f172a',
        color: 'white',
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Menu auto-masquant */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          padding: '1rem 2rem',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          opacity: menuVisible ? 1 : 0,
          pointerEvents: menuVisible ? 'auto' : 'none',
          transition: 'opacity 0.4s ease',
        }}
      >
        <span style={{ fontSize: '1rem', color: '#94a3b8', marginRight: '0.5rem', fontWeight: 600 }}>
          Mode Kiosk
        </span>
        <button
          style={btnStyle(currentView === 'pools', !hasPoolData)}
          disabled={!hasPoolData}
          onClick={() => { if (hasPoolData) setCurrentView('pools'); }}
        >
          🏆 Poules
        </button>
        <button
          style={btnStyle(currentView === 'ranking', !hasRankingData)}
          disabled={!hasRankingData}
          onClick={() => { if (hasRankingData) setCurrentView('ranking'); }}
        >
          📊 Classement
        </button>
        <button
          style={btnStyle(currentView === 'tableau', !hasTableauData)}
          disabled={!hasTableauData}
          onClick={() => { if (hasTableauData) setCurrentView('tableau'); }}
        >
          🥇 Tableau
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Echap pour quitter</span>
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid #475569',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          ✕ Fermer
        </button>
      </div>

      {/* ===== VUE POULES ===== */}
      {currentView === 'pools' && currentPool && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '70px 40px 40px' }}>
          {/* Header poule */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #334155', paddingBottom: '20px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 'bold' }}>{competition.title}</h1>
              <p style={{ margin: '8px 0 0', fontSize: '1.1rem', color: '#94a3b8' }}>
                Poule {currentPool.number} / {pools.length}
                <span style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
                  {pools.length > 1 && '← → naviguer'}
                </span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {poolCompleted}/{poolTotal}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>matchs terminés</div>
            </div>
          </div>

          {/* Barre de progression */}
          <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', marginBottom: '32px', overflow: 'hidden' }}>
            <div style={{ width: `${poolProgress}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.5s ease' }} />
          </div>

          {/* Contenu */}
          <div style={{ flex: 1, display: 'flex', gap: '24px', minHeight: 0 }}>
            {/* Classement poule */}
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: '16px', fontSize: '1.3rem', color: '#94a3b8' }}>Classement</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentPool.ranking?.slice(0, 8).map((rank, i) => (
                  <div key={rank.fencer.id} style={{
                    display: 'flex', alignItems: 'center', padding: '16px',
                    backgroundColor: i < 3 ? '#1e3a5f' : '#1e293b',
                    borderRadius: '10px',
                    border: i < 3 ? '2px solid #3b82f6' : '2px solid transparent',
                  }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: i < 3 ? '#3b82f6' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 'bold', marginRight: '16px', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
                        {rank.fencer.lastName} {rank.fencer.firstName}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{rank.fencer.club || 'Sans club'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {rank.victories}V – {rank.defeats}D
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        {rank.matchesPlayed} match{rank.matchesPlayed !== 1 ? 's' : ''}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        TD {rank.touchesScored} / TR {rank.touchesReceived}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Matchs en cours */}
            <div style={{ width: '360px', flexShrink: 0 }}>
              <h2 style={{ marginBottom: '16px', fontSize: '1.3rem', color: '#94a3b8' }}>Matchs en cours</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentPool.matches.filter(m => m.status === MatchStatus.IN_PROGRESS).slice(0, 4).map((match, idx) => (
                  <div key={match.id} style={{ padding: '16px', backgroundColor: '#dc2626', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      <span>{match.fencerA?.lastName || 'TBD'}</span>
                      <span style={{ color: '#fca5a5', fontSize: '0.9rem' }}>VS</span>
                      <span>{match.fencerB?.lastName || 'TBD'}</span>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '1rem', color: '#fca5a5' }}>
                      Piste {match.strip || idx + 1}
                    </div>
                  </div>
                ))}
                {currentPool.matches.filter(m => m.status === MatchStatus.IN_PROGRESS).length === 0 && (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}>
                    Aucun match en cours
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation dots */}
          {pools.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              {pools.map((_, i) => (
                <div key={i} onClick={() => setCurrentPoolIndex(i)} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: i === currentPoolIndex ? '#3b82f6' : '#334155', cursor: 'pointer', transition: 'background 0.2s' }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== VUE CLASSEMENT ===== */}
      {currentView === 'ranking' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '70px 40px 0', minHeight: 0 }}>
          {/* Header */}
          <div style={{ marginBottom: '24px', borderBottom: '2px solid #334155', paddingBottom: '16px', flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{competition.title}</h1>
            <p style={{ margin: '6px 0 0', fontSize: '1.1rem', color: '#94a3b8' }}>
              Classement Provisoire · {overallRanking.length} tireur{overallRanking.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Tableau défilant */}
          <div ref={rankingScrollRef} style={{ flex: 1, overflowY: 'hidden', paddingBottom: '40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.05rem' }}>
              <thead>
                <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 12px', width: '60px' }}>Rg</th>
                  <th style={{ padding: '10px 12px' }}>Nom</th>
                  <th style={{ padding: '10px 12px' }}>Prénom</th>
                  <th style={{ padding: '10px 12px' }}>Club</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>V/M</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>TD</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>TR</th>
                  {isLaserSabre && <th style={{ padding: '10px 12px', textAlign: 'center', width: '80px', color: '#a78bfa' }}>Quest</th>}
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>Indice</th>
                </tr>
              </thead>
              <tbody>
                {overallRanking.map((r, i) => (
                  <tr key={r.fencer.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '1.2rem', color: i < 3 ? '#3b82f6' : 'white' }}>
                      {r.rank}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, fontSize: '1.1rem' }}>{r.fencer.lastName}</td>
                    <td style={{ padding: '12px', fontSize: '1.05rem' }}>{r.fencer.firstName}</td>
                    <td style={{ padding: '12px', color: '#94a3b8', fontSize: '0.95rem' }}>{r.fencer.club || '–'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{formatRatio(r.ratio)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{r.touchesScored}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{r.touchesReceived}</td>
                    {isLaserSabre && <td style={{ padding: '12px', textAlign: 'center', color: '#a78bfa', fontWeight: 600 }}>{r.questPoints || 0}</td>}
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: r.index >= 0 ? '#10b981' : '#f87171' }}>
                      {formatIndex(r.index)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== VUE TABLEAU ===== */}
      {currentView === 'tableau' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '70px 40px 0', minHeight: 0 }}>
          {/* Header */}
          <div style={{ marginBottom: '24px', borderBottom: '2px solid #334155', paddingBottom: '16px', flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{competition.title}</h1>
            <p style={{ margin: '6px 0 0', fontSize: '1.3rem', color: '#3b82f6', fontWeight: 600 }}>
              {activeRound !== null
                ? (roundNames[activeRound] || `Tour ${activeRound}`)
                : 'Tableau terminé'}
            </p>
          </div>

          {/* Contenu */}
          {activeRound !== null ? (
            <div ref={tableauScrollRef} style={{ flex: 1, overflowY: 'hidden', paddingBottom: '40px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
                {activeRoundMatches.map(match => {
                  if (match.isBye) {
                    return (
                      <div key={match.id} style={{ padding: '20px 24px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', opacity: 0.5 }}>
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '1rem' }}>EXEMPT</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '4px' }}>
                          {match.fencerA?.lastName || match.fencerB?.lastName || '–'}
                        </div>
                      </div>
                    );
                  }

                  const winnerIsA = match.winner && match.fencerA && match.winner.id === match.fencerA.id;
                  const winnerIsB = match.winner && match.fencerB && match.winner.id === match.fencerB.id;
                  const isFinished = match.winner !== null;

                  return (
                    <div key={match.id} style={{ padding: '20px 24px', backgroundColor: '#1e293b', borderRadius: '12px', border: `2px solid ${isFinished ? '#334155' : '#3b82f6'}` }}>
                      {/* Tireur A */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
                        backgroundColor: winnerIsA ? 'rgba(16,185,129,0.2)' : winnerIsB ? 'rgba(255,255,255,0.03)' : 'transparent',
                        border: winnerIsA ? '1px solid #10b981' : '1px solid transparent',
                      }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 600, color: winnerIsB ? '#475569' : 'white' }}>
                          {match.fencerA ? `${match.fencerA.lastName} ${match.fencerA.firstName.charAt(0)}.` : 'À déterminer'}
                          {match.fencerA?.club && <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '8px' }}>{match.fencerA.club}</span>}
                        </span>
                        {isFinished && match.scoreA !== null && (
                          <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: winnerIsA ? '#10b981' : '#475569' }}>
                            {match.scoreA}
                          </span>
                        )}
                      </div>

                      {/* Séparateur */}
                      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#475569', margin: '2px 0' }}>VS</div>

                      {/* Tireur B */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', borderRadius: '8px', marginTop: '6px',
                        backgroundColor: winnerIsB ? 'rgba(16,185,129,0.2)' : winnerIsA ? 'rgba(255,255,255,0.03)' : 'transparent',
                        border: winnerIsB ? '1px solid #10b981' : '1px solid transparent',
                      }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 600, color: winnerIsA ? '#475569' : 'white' }}>
                          {match.fencerB ? `${match.fencerB.lastName} ${match.fencerB.firstName.charAt(0)}.` : 'À déterminer'}
                          {match.fencerB?.club && <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '8px' }}>{match.fencerB.club}</span>}
                        </span>
                        {isFinished && match.scoreB !== null && (
                          <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: winnerIsB ? '#10b981' : '#475569' }}>
                            {match.scoreB}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Tableau terminé – afficher le champion */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px' }}>
              <div style={{ fontSize: '5rem' }}>🥇</div>
              {champion ? (
                <>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', textAlign: 'center' }}>
                    {champion.lastName} {champion.firstName}
                  </div>
                  {champion.club && (
                    <div style={{ fontSize: '1.3rem', color: '#94a3b8' }}>{champion.club}</div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '1.5rem', color: '#94a3b8' }}>Tableau terminé</div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes kioskPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default KioskDisplay;
