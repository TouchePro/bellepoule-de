/**
 * BellePoule Modern - Competition Navigation Sub-component
 * Licensed under GPL-3.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Wrench, Wifi, Tv2, Swords, Target, Zap, Trophy } from 'lucide-react';
import { Competition, MatchStatus, QuestPhaseConfig, Fencer } from '../../../shared/types';
import { Phase } from '../../hooks/useCompetitionSession';
import CoachMark from '../CoachMark';
import { WifiQRModal } from '../WifiQRModal';
import { XiaomiRemotePanel } from '../XiaomiRemotePanel';

interface PhaseItem {
  id: string;
  label: string;
  icon: string;
  disabled: boolean;
  title?: string;
}

interface PoolItem {
  isComplete: boolean;
  matches: Array<{ status: MatchStatus }>;
}

interface TableauMatchItem {
  winner: unknown;
  fencerA: unknown;
  fencerB: unknown;
}

interface PoolsNextAction {
  label: string;
  action: () => void;
}

interface CompetitionNavProps {
  competition: Competition;
  phases: PhaseItem[];
  currentPhase: Phase;
  setCurrentPhase: (phase: Phase) => void;
  language: string;
  t: (key: string, params?: { [key: string]: string | number }) => string;
  handleGoBack: () => void;
  handleGeneratePools: () => void;
  poolsNextAction: PoolsNextAction | null;
  questEnabled: boolean;
  questConfig: QuestPhaseConfig | undefined;
  fencers: Fencer[];
  getCheckedInFencers: () => Fencer[];
  pools: PoolItem[];
  tableauMatches: TableauMatchItem[];
  remoteServerUrl?: string;
  remoteArenaCount?: number;
}

const CompetitionNavComponent: React.FC<CompetitionNavProps> = ({
  competition,
  phases,
  currentPhase,
  setCurrentPhase,
  t,
  handleGoBack,
  handleGeneratePools,
  poolsNextAction,
  questEnabled,
  questConfig,
  fencers,
  getCheckedInFencers,
  pools,
  tableauMatches,
  remoteServerUrl,
  remoteArenaCount = 4,
}) => {
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showWifiQR, setShowWifiQR] = useState(false);
  const [showTVRemote, setShowTVRemote] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const toolsBtnRef = useRef<HTMLButtonElement>(null);
  const [toolsMenuPos, setToolsMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    if (!showToolsMenu) return;
    const rect = toolsBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setToolsMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    const handler = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showToolsMenu]);

  return (
  <>
    {/* Breadcrumb */}
    <div style={{ padding: '0.25rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontWeight: 500, opacity: 0.7 }}>{competition.title}</span>
      <span>›</span>
      <span style={{ fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>
        {phases.find(p => p.id === currentPhase)?.label ?? currentPhase}
      </span>
    </div>

    {/* Navigation */}
    <div className="phase-nav">
      {phases.map((phase, index) => (
        <React.Fragment key={phase.id}>
          <div
            className={`phase-step ${currentPhase === phase.id ? 'phase-step-active' : ''} ${phase.disabled ? 'phase-step-disabled' : ''}`}
            onClick={() => !phase.disabled && setCurrentPhase(phase.id as Phase)}
            title={phase.title ?? (phase.disabled ? 'Section non disponible' : undefined)}
          >
            <span className="phase-step-number">{phase.icon}</span>
            <span>{phase.label}</span>
          </div>
          {index < phases.length - 1 && (
            <div className={`phase-step-connector${!phase.disabled && !phases[index + 1]?.disabled ? ' connector-done' : ''}`} />
          )}
        </React.Fragment>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {currentPhase !== 'checkin' && (
          <button className="btn btn-secondary btn-icon-label" onClick={handleGoBack}>
            <ChevronLeft size={15} /> Retour
          </button>
        )}
        {currentPhase === 'checkin' && questEnabled && !questConfig?.hasPreliminaryPools && (
          <button
            className="btn btn-primary btn-icon-label"
            onClick={() => setCurrentPhase('quest')}
            disabled={getCheckedInFencers().length < 2}
          >
            Tour Quest <ChevronRight size={15} />
          </button>
        )}
        {currentPhase === 'checkin' && (!questEnabled || questConfig?.hasPreliminaryPools) && (
          <CoachMark id="generate-pools" message="Cliquez ici après avoir pointé tous vos tireurs" position="bottom">
            <button
              className="btn btn-primary btn-icon-label"
              onClick={handleGeneratePools}
              disabled={getCheckedInFencers().length < 4}
              title={
                getCheckedInFencers().length < 4
                  ? `Minimum 4 tireurs pointés requis (${getCheckedInFencers().length} actuellement)`
                  : getCheckedInFencers().length === fencers.length && fencers.length > 0
                    ? 'Tous les tireurs sont pointés — prêt !'
                    : undefined
              }
              style={
                getCheckedInFencers().length === fencers.length && fencers.length >= 4
                  ? { background: '#16a34a', borderColor: '#15803d' }
                  : undefined
              }
            >
              Générer les poules <ChevronRight size={15} />
            </button>
          </CoachMark>
        )}
        {currentPhase === 'pools' && poolsNextAction && (
          <button className="btn btn-primary" onClick={poolsNextAction.action}>
            {poolsNextAction.label}
          </button>
        )}

        {/* Bouton menu outils */}
        <div ref={toolsMenuRef} style={{ position: 'relative' }}>
          <button
            ref={toolsBtnRef}
            className="btn btn-secondary btn-icon-label"
            onClick={() => setShowToolsMenu(v => !v)}
            title="Outils"
            aria-haspopup="true"
            aria-expanded={showToolsMenu}
          >
            <Wrench size={15} /> Outils
          </button>
          {showToolsMenu && (
            <div
              style={{
                position: 'fixed',
                right: toolsMenuPos.right,
                top: toolsMenuPos.top,
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-xl)',
                minWidth: '200px',
                zIndex: 1100,
                overflow: 'hidden',
              }}
            >
              <button
                className="comp-header-dropdown-item"
                onClick={() => { setShowWifiQR(true); setShowToolsMenu(false); }}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Wifi size={15} /> QR Code WiFi
              </button>
              <button
                className="comp-header-dropdown-item"
                onClick={() => { setShowTVRemote(true); setShowToolsMenu(false); }}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Tv2 size={15} /> Télécommande TV
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Stats bar */}
    {(pools.length > 0 || tableauMatches.length > 0 || fencers.length > 0) && (
      <div className="comp-stats-bar">
        <div className="comp-stats-bar-item">
          <span className="comp-stats-bar-icon"><Swords size={13} /></span>
          <span>{getCheckedInFencers().length}/{fencers.length} tireurs</span>
        </div>
        {pools.length > 0 && (
          <>
            <div className="comp-stats-bar-sep" />
            <div className="comp-stats-bar-item">
              <span className="comp-stats-bar-icon"><Target size={13} /></span>
              <span>{pools.filter(p => p.isComplete).length}/{pools.length} poules</span>
            </div>
            <div className="comp-stats-bar-sep" />
            <div className="comp-stats-bar-item">
              <span className="comp-stats-bar-icon"><Zap size={13} /></span>
              <span>
                {pools.reduce((s, p) => s + p.matches.filter(m => m.status === MatchStatus.FINISHED).length, 0)}/
                {pools.reduce((s, p) => s + p.matches.length, 0)} matchs
              </span>
            </div>
          </>
        )}
        {tableauMatches.length > 0 && (
          <>
            <div className="comp-stats-bar-sep" />
            <div className="comp-stats-bar-item">
              <span className="comp-stats-bar-icon"><Trophy size={13} /></span>
              <span>
                {tableauMatches.filter(m => m.winner !== null).length}/
                {tableauMatches.filter(m => m.fencerA && m.fencerB).length} tableau
              </span>
            </div>
          </>
        )}
      </div>
    )}

    {showWifiQR && <WifiQRModal onClose={() => setShowWifiQR(false)} />}
    {showTVRemote && (
      <XiaomiRemotePanel
        competitionId={competition.id}
        serverUrl={remoteServerUrl ?? ''}
        arenaCount={remoteArenaCount}
        onClose={() => setShowTVRemote(false)}
      />
    )}
  </>
  );
};

const CompetitionNav = React.memo(CompetitionNavComponent);
export default CompetitionNav;
