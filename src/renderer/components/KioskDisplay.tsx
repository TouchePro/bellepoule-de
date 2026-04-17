/**
 * BellePoule Modern - Kiosk Display Component
 * Affichage grand écran public avec menu auto-masquant
 * Vues : Poules / Classement provisoire / Tableau d'élimination
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Competition, Pool, Weapon, MatchStatus, Fencer } from '../../shared/types';
import { OrgNote } from '../../shared/types/remote';
import { TableauMatch } from './TableauView';
import {
  calculateOverallRanking,
  calculateOverallRankingQuest,
  formatRatio,
  formatIndex,
} from '../../shared/utils/poolCalculations';

type KioskView = 'pools' | 'ranking' | 'tableau';

const roundNames: Record<number, string> = {
  2: 'Finale',
  3: 'Petite finale',
  4: 'Demi-finales',
  8: 'Quarts de finale',
  16: '1/8 de finale',
  32: '1/16 de finale',
  64: '1/32 de finale',
  128: '1/64 de finale',
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
    const allDone =
      pools.length > 0 && pools.every(p => p.matches.every(m => m.status === MatchStatus.FINISHED));
    if (allDone) return 'ranking';
    return 'pools';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [currentView, setCurrentView] = useState<KioskView>(initialView);

  // Auto-switch vers tableau quand les matchs d'élimination arrivent (changement de phase en direct)
  useEffect(() => {
    if (tableauMatches.length > 0 && currentView !== 'tableau') {
      setCurrentView('tableau');
    }
  }, [tableauMatches.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const incomplete = tableauMatches.filter(m => m.fencerA && m.fencerB && !m.winner && !m.isBye);
    if (incomplete.length === 0) return null;
    return Math.max(...incomplete.map(m => m.round));
  }, [tableauMatches]);

  const activeRoundMatches = useMemo(() => {
    if (activeRound === null) return [];
    return tableauMatches.filter(m => m.round === activeRound);
  }, [tableauMatches, activeRound]);

  // Podium (quand tableau terminé)
  const podium = useMemo(() => {
    if (activeRound !== null) return null;
    const finalMatch = tableauMatches.find(m => m.round === 2);
    if (!finalMatch?.winner) return null;
    const first = finalMatch.winner;
    const second = finalMatch.fencerA?.id === first.id ? finalMatch.fencerB : finalMatch.fencerA;
    const thirdMatch = tableauMatches.find(m => m.round === 3);
    const third = thirdMatch?.winner ?? null;
    return { first, second, third };
  }, [tableauMatches, activeRound]);

  // Classement d'élimination complet (quand tableau terminé)
  const elimRanking = useMemo(() => {
    if (activeRound !== null) return [];
    const results: { place: number; fencer: Fencer; eliminatedAt: string }[] = [];

    const finalMatch = tableauMatches.find(m => m.round === 2);
    if (!finalMatch?.winner) return [];

    const first = finalMatch.winner;
    const second = finalMatch.fencerA?.id === first.id ? finalMatch.fencerB : finalMatch.fencerA;
    results.push({ place: 1, fencer: first, eliminatedAt: '' });
    if (second) results.push({ place: 2, fencer: second, eliminatedAt: 'Finale' });

    const thirdMatch = tableauMatches.find(m => m.round === 3);
    if (thirdMatch?.winner) {
      const third = thirdMatch.winner;
      const fourth = thirdMatch.fencerA?.id === third.id ? thirdMatch.fencerB : thirdMatch.fencerA;
      results.push({ place: 3, fencer: third, eliminatedAt: '' });
      if (fourth) results.push({ place: 4, fencer: fourth, eliminatedAt: 'Petite finale' });
    } else {
      // Sans petite finale : perdants des demi-finales ex-aequo 3e
      const semis = tableauMatches.filter(m => m.round === 4 && m.winner);
      let place = 3;
      for (const semi of semis) {
        const loser = semi.fencerA?.id === semi.winner!.id ? semi.fencerB : semi.fencerA;
        if (loser) results.push({ place, fencer: loser, eliminatedAt: 'Demi-finales' });
        place++;
      }
    }

    // Tours suivants : perdants de chaque round
    let currentPlace = results.length + 1;
    for (const round of [8, 16, 32, 64, 128]) {
      const roundMatches = tableauMatches.filter(m => m.round === round && m.winner);
      if (roundMatches.length === 0) break;
      for (const m of roundMatches) {
        const loser = m.fencerA?.id === m.winner!.id ? m.fencerB : m.fencerA;
        if (loser)
          results.push({
            place: currentPlace,
            fencer: loser,
            eliminatedAt: roundNames[round] || `Tour ${round}`,
          });
      }
      currentPlace += roundMatches.length;
    }

    return results;
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
    let delayId: ReturnType<typeof setTimeout>;

    const step = (t: number) => {
      if (last !== null) {
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll > 0) {
          el.scrollTop += ((t - last) / 1000) * 20;
          if (el.scrollTop >= maxScroll) el.scrollTop = 0;
        }
      }
      last = t;
      animId = requestAnimationFrame(step);
    };
    delayId = setTimeout(() => {
      animId = requestAnimationFrame(step);
    }, 2000);
    return () => {
      clearTimeout(delayId);
      cancelAnimationFrame(animId);
    };
  }, [currentView, overallRanking]);

  // Auto-scroll tableau
  useEffect(() => {
    if (currentView !== 'tableau') return;
    const el = tableauScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    let animId: number;
    let last: number | null = null;
    let delayId: ReturnType<typeof setTimeout>;

    const step = (t: number) => {
      if (last !== null) {
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll > 0) {
          el.scrollTop += ((t - last) / 1000) * 20;
          if (el.scrollTop >= maxScroll) el.scrollTop = 0;
        }
      }
      last = t;
      animId = requestAnimationFrame(step);
    };
    delayId = setTimeout(() => {
      animId = requestAnimationFrame(step);
    }, 2000);
    return () => {
      clearTimeout(delayId);
      cancelAnimationFrame(animId);
    };
  }, [currentView, activeRound]);

  // Note d'organisation
  const [orgNote, setOrgNote] = useState<OrgNote | null>(null);
  const [orgNoteCountdown, setOrgNoteCountdown] = useState<string>('');

  useEffect(() => {
    if (!window.electronAPI?.onKioskNoteUpdate) return;
    const unsub = window.electronAPI.onKioskNoteUpdate(note => setOrgNote(note));
    return unsub;
  }, []);

  useEffect(() => {
    if (!orgNote || orgNote.type !== 'target_time' || !orgNote.targetTime) {
      setOrgNoteCountdown('');
      return;
    }
    const compute = () => {
      const now = new Date();
      const [hh, mm] = orgNote.targetTime!.split(':').map(Number);
      const target = new Date(now);
      target.setHours(hh, mm, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1); // lendemain si dépassé
      const diffSec = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
      if (diffSec === 0) {
        window.electronAPI.remote.clearOrgNote();
        return;
      }
      const m = Math.floor(diffSec / 60);
      const s = diffSec % 60;
      setOrgNoteCountdown(`${m} min ${s.toString().padStart(2, '0')} s`);
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [orgNote]);

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
        <span
          style={{ fontSize: '1rem', color: '#94a3b8', marginRight: '0.5rem', fontWeight: 600 }}
        >
          Mode Kiosk
        </span>
        <button
          style={btnStyle(currentView === 'pools', !hasPoolData)}
          disabled={!hasPoolData}
          onClick={() => {
            if (hasPoolData) setCurrentView('pools');
          }}
        >
          🏆 Poules
        </button>
        <button
          style={btnStyle(currentView === 'ranking', !hasRankingData)}
          disabled={!hasRankingData}
          onClick={() => {
            if (hasRankingData) setCurrentView('ranking');
          }}
        >
          📊 Classement
        </button>
        <button
          style={btnStyle(currentView === 'tableau', !hasTableauData)}
          disabled={!hasTableauData}
          onClick={() => {
            if (hasTableauData) setCurrentView('tableau');
          }}
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
        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '70px 40px 40px' }}
        >
          {/* Header poule */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              borderBottom: '2px solid #334155',
              paddingBottom: '20px',
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 'bold' }}>
                {competition.title}
              </h1>
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
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#1e293b',
              borderRadius: '3px',
              marginBottom: '32px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${poolProgress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.5s ease',
              }}
            />
          </div>

          {/* Contenu */}
          <div style={{ flex: 1, display: 'flex', gap: '24px', minHeight: 0 }}>
            {/* Classement poule */}
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: '16px', fontSize: '1.3rem', color: '#94a3b8' }}>
                Classement
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentPool.ranking?.slice(0, 8).map((rank, i) => (
                  <div
                    key={rank.fencer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px',
                      backgroundColor: i < 3 ? '#1e3a5f' : '#1e293b',
                      borderRadius: '10px',
                      border: i < 3 ? '2px solid #3b82f6' : '2px solid transparent',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: i < 3 ? '#3b82f6' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                        fontWeight: 'bold',
                        marginRight: '16px',
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
                        {rank.fencer.lastName} {rank.fencer.firstName}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                        {rank.fencer.club || 'Sans club'}
                      </div>
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
              <h2 style={{ marginBottom: '16px', fontSize: '1.3rem', color: '#94a3b8' }}>
                Matchs en cours
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentPool.matches
                  .filter(m => m.status === MatchStatus.IN_PROGRESS)
                  .slice(0, 4)
                  .map((match, idx) => (
                    <div
                      key={match.id}
                      style={{ padding: '16px', backgroundColor: '#dc2626', borderRadius: '10px' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                        }}
                      >
                        <span>{match.fencerA?.lastName || 'TBD'}</span>
                        <span style={{ color: '#fca5a5', fontSize: '0.9rem' }}>VS</span>
                        <span>{match.fencerB?.lastName || 'TBD'}</span>
                      </div>
                      <div
                        style={{
                          textAlign: 'center',
                          marginTop: '8px',
                          fontSize: '1rem',
                          color: '#fca5a5',
                        }}
                      >
                        Piste {match.strip || idx + 1}
                      </div>
                    </div>
                  ))}
                {currentPool.matches.filter(m => m.status === MatchStatus.IN_PROGRESS).length ===
                  0 && (
                  <div
                    style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '1.1rem',
                    }}
                  >
                    Aucun match en cours
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation dots */}
          {pools.length > 1 && (
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}
            >
              {pools.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentPoolIndex(i)}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: i === currentPoolIndex ? '#3b82f6' : '#334155',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== VUE CLASSEMENT ===== */}
      {currentView === 'ranking' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '70px 40px 0',
            minHeight: 0,
          }}
        >
          {/* Header */}
          <div
            style={{
              marginBottom: '24px',
              borderBottom: '2px solid #334155',
              paddingBottom: '16px',
              flexShrink: 0,
            }}
          >
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{competition.title}</h1>
            <p style={{ margin: '6px 0 0', fontSize: '1.1rem', color: '#94a3b8' }}>
              Classement Provisoire · {overallRanking.length} tireur
              {overallRanking.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Tableau défilant */}
          <div
            ref={rankingScrollRef}
            data-kiosk-scroll=""
            style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.05rem' }}>
              <thead>
                <tr
                  style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #334155' }}
                >
                  <th style={{ padding: '10px 12px', width: '60px' }}>Rg</th>
                  <th style={{ padding: '10px 12px' }}>Nom</th>
                  <th style={{ padding: '10px 12px' }}>Prénom</th>
                  <th style={{ padding: '10px 12px' }}>Club</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>V/M</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>TD</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>TR</th>
                  {isLaserSabre && (
                    <th
                      style={{
                        padding: '10px 12px',
                        textAlign: 'center',
                        width: '80px',
                        color: '#a78bfa',
                      }}
                    >
                      Quest
                    </th>
                  )}
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>
                    Indice
                  </th>
                </tr>
              </thead>
              <tbody>
                {overallRanking.map((r, i) => (
                  <tr
                    key={r.fencer.id}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <td
                      style={{
                        padding: '12px',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        color: i < 3 ? '#3b82f6' : 'white',
                      }}
                    >
                      {r.rank}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, fontSize: '1.1rem' }}>
                      {r.fencer.lastName}
                    </td>
                    <td style={{ padding: '12px', fontSize: '1.05rem' }}>{r.fencer.firstName}</td>
                    <td style={{ padding: '12px', color: '#94a3b8', fontSize: '0.95rem' }}>
                      {r.fencer.club || '–'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{formatRatio(r.ratio)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{r.touchesScored}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{r.touchesReceived}</td>
                    {isLaserSabre && (
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          color: '#a78bfa',
                          fontWeight: 600,
                        }}
                      >
                        {r.questPoints || 0}
                      </td>
                    )}
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: 600,
                        color: r.index >= 0 ? '#10b981' : '#f87171',
                      }}
                    >
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
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '70px 40px 0',
            minHeight: 0,
          }}
        >
          {/* Header */}
          <div
            style={{
              marginBottom: '24px',
              borderBottom: '2px solid #334155',
              paddingBottom: '16px',
              flexShrink: 0,
            }}
          >
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{competition.title}</h1>
            <p style={{ margin: '6px 0 0', fontSize: '1.3rem', color: '#3b82f6', fontWeight: 600 }}>
              {activeRound !== null
                ? roundNames[activeRound] || `Tour ${activeRound}`
                : 'Tableau terminé'}
            </p>
          </div>

          {/* Contenu */}
          {activeRound !== null ? (
            <div
              ref={tableauScrollRef}
              data-kiosk-scroll=""
              style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                  gap: '16px',
                }}
              >
                {activeRoundMatches.map(match => {
                  if (match.isBye) {
                    return (
                      <div
                        key={match.id}
                        style={{
                          padding: '20px 24px',
                          backgroundColor: '#1e293b',
                          borderRadius: '12px',
                          border: '1px solid #334155',
                          opacity: 0.5,
                        }}
                      >
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '1rem' }}>
                          EXEMPT
                        </div>
                        <div
                          style={{
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                            marginTop: '4px',
                          }}
                        >
                          {match.fencerA?.lastName || match.fencerB?.lastName || '–'}
                        </div>
                      </div>
                    );
                  }

                  const winnerIsA =
                    match.winner && match.fencerA && match.winner.id === match.fencerA.id;
                  const winnerIsB =
                    match.winner && match.fencerB && match.winner.id === match.fencerB.id;
                  const isFinished = match.winner !== null;

                  return (
                    <div
                      key={match.id}
                      style={{
                        padding: '20px 24px',
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        border: `2px solid ${isFinished ? '#334155' : '#3b82f6'}`,
                      }}
                    >
                      {/* Tireur A */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          marginBottom: '6px',
                          backgroundColor: winnerIsA
                            ? 'rgba(16,185,129,0.2)'
                            : winnerIsB
                              ? 'rgba(255,255,255,0.03)'
                              : 'transparent',
                          border: winnerIsA ? '1px solid #10b981' : '1px solid transparent',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            color: winnerIsB ? '#475569' : 'white',
                          }}
                        >
                          {match.fencerA
                            ? `${match.fencerA.lastName} ${match.fencerA.firstName.charAt(0)}.`
                            : 'À déterminer'}
                          {match.fencerA?.club && (
                            <span
                              style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '8px' }}
                            >
                              {match.fencerA.club}
                            </span>
                          )}
                        </span>
                        {isFinished && match.scoreA !== null && (
                          <span
                            style={{
                              fontSize: '1.6rem',
                              fontWeight: 'bold',
                              color: winnerIsA ? '#10b981' : '#475569',
                            }}
                          >
                            {match.scoreA}
                          </span>
                        )}
                      </div>

                      {/* Séparateur */}
                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: '0.75rem',
                          color: '#475569',
                          margin: '2px 0',
                        }}
                      >
                        VS
                      </div>

                      {/* Tireur B */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          marginTop: '6px',
                          backgroundColor: winnerIsB
                            ? 'rgba(16,185,129,0.2)'
                            : winnerIsA
                              ? 'rgba(255,255,255,0.03)'
                              : 'transparent',
                          border: winnerIsB ? '1px solid #10b981' : '1px solid transparent',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            color: winnerIsA ? '#475569' : 'white',
                          }}
                        >
                          {match.fencerB
                            ? `${match.fencerB.lastName} ${match.fencerB.firstName.charAt(0)}.`
                            : 'À déterminer'}
                          {match.fencerB?.club && (
                            <span
                              style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '8px' }}
                            >
                              {match.fencerB.club}
                            </span>
                          )}
                        </span>
                        {isFinished && match.scoreB !== null && (
                          <span
                            style={{
                              fontSize: '1.6rem',
                              fontWeight: 'bold',
                              color: winnerIsB ? '#10b981' : '#475569',
                            }}
                          >
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
            /* Tableau terminé – podium + classement */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                gap: '24px',
              }}
            >
              {/* Titre */}
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: '#fbbf24',
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                }}
              >
                🏆 RÉSULTATS FINAUX
              </div>

              {/* Podium visuel */}
              {podium ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    gap: '16px',
                    flexShrink: 0,
                  }}
                >
                  {/* 2e place */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '2.2rem' }}>🥈</div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        textAlign: 'center',
                        maxWidth: '200px',
                      }}
                    >
                      {podium.second ? `${podium.second.lastName} ${podium.second.firstName}` : '–'}
                    </div>
                    {podium.second?.club && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                        {podium.second.club}
                      </div>
                    )}
                    <div
                      style={{
                        width: '180px',
                        height: '80px',
                        backgroundColor: '#475569',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        color: '#94a3b8',
                      }}
                    >
                      2
                    </div>
                  </div>
                  {/* 1re place */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '3rem' }}>🥇</div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '1.5rem',
                        textAlign: 'center',
                        maxWidth: '220px',
                        color: '#fbbf24',
                      }}
                    >
                      {podium.first.lastName} {podium.first.firstName}
                    </div>
                    {podium.first.club && (
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: '#fbbf24',
                          opacity: 0.8,
                          textAlign: 'center',
                        }}
                      >
                        {podium.first.club}
                      </div>
                    )}
                    <div
                      style={{
                        width: '200px',
                        height: '120px',
                        backgroundColor: '#b45309',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 800,
                        color: '#fbbf24',
                      }}
                    >
                      1
                    </div>
                  </div>
                  {/* 3e place */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '2.2rem' }}>🥉</div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        textAlign: 'center',
                        maxWidth: '200px',
                      }}
                    >
                      {podium.third ? `${podium.third.lastName} ${podium.third.firstName}` : '–'}
                    </div>
                    {podium.third?.club && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                        {podium.third.club}
                      </div>
                    )}
                    <div
                      style={{
                        width: '180px',
                        height: '60px',
                        backgroundColor: '#713f12',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        color: '#d97706',
                      }}
                    >
                      3
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '1.3rem' }}>
                  Tableau terminé
                </div>
              )}

              {/* Classement général */}
              {elimRanking.length > 0 && (
                <div
                  ref={tableauScrollRef}
                  style={{
                    flex: 1,
                    overflowY: 'hidden',
                    borderTop: '1px solid #334155',
                    paddingTop: '16px',
                  }}
                >
                  <div
                    style={{
                      color: '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '10px',
                      paddingLeft: '4px',
                    }}
                  >
                    Classement général
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
                    <thead>
                      <tr
                        style={{
                          color: '#64748b',
                          textAlign: 'left',
                          borderBottom: '1px solid #334155',
                        }}
                      >
                        <th style={{ padding: '6px 10px', width: '50px' }}>Rg</th>
                        <th style={{ padding: '6px 10px' }}>Nom</th>
                        <th style={{ padding: '6px 10px' }}>Prénom</th>
                        <th style={{ padding: '6px 10px' }}>Club</th>
                        <th style={{ padding: '6px 10px', color: '#475569', fontStyle: 'italic' }}>
                          Éliminé en
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {elimRanking.map(r => {
                        const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
                        const isTop3 = r.place <= 3;
                        return (
                          <tr
                            key={r.fencer.id}
                            style={{
                              borderBottom: '1px solid #1e293b',
                              backgroundColor: isTop3 ? 'rgba(251,191,36,0.06)' : 'transparent',
                            }}
                          >
                            <td
                              style={{
                                padding: '8px 10px',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                              }}
                            >
                              {medals[r.place] ?? (
                                <span style={{ color: '#64748b' }}>{r.place}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                              {r.fencer.lastName}
                            </td>
                            <td style={{ padding: '8px 10px' }}>{r.fencer.firstName}</td>
                            <td
                              style={{ padding: '8px 10px', color: '#94a3b8', fontSize: '0.9rem' }}
                            >
                              {r.fencer.club || '–'}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                color: '#475569',
                                fontSize: '0.85rem',
                                fontStyle: 'italic',
                              }}
                            >
                              {r.eliminatedAt}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== OVERLAY NOTE D'ORGANISATION ===== */}
      {orgNote && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10500,
            background: 'rgba(2, 6, 23, 0.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            textAlign: 'center',
            padding: '3rem',
          }}
        >
          <div style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', color: '#64748b', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            ⏸ Pause
          </div>
          {orgNote.type === 'target_time' && orgNote.targetTime && (
            <>
              <div style={{ fontSize: 'clamp(4rem, 14vw, 12rem)', fontWeight: 700, color: '#f1f5f9' }}>
                Reprise à {orgNote.targetTime.replace(':', 'h')}
              </div>
              <div style={{ fontSize: 'clamp(3rem, 10vw, 8rem)', fontWeight: 800, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>
                dans {orgNoteCountdown}
              </div>
            </>
          )}
          {orgNote.message && (
            <div style={{ fontSize: 'clamp(2rem, 7vw, 6rem)', color: '#94a3b8', fontStyle: 'italic' }}>
              «&nbsp;{orgNote.message}&nbsp;»
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes kioskPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        [data-kiosk-scroll]::-webkit-scrollbar { display: none; }
        [data-kiosk-scroll] { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  );
};

export default KioskDisplay;
