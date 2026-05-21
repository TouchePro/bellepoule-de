/**
 * BellePoule Modern - Competition Header Sub-component
 * Licensed under GPL-3.0
 */

import React from 'react';
import { Competition, MatchStatus } from '../../../shared/types';
import Confetti from '../Confetti';
import CoachMark from '../CoachMark';
import { Phase } from '../../hooks/useCompetitionSession';

interface MatchProgress {
  done: number;
  total: number;
  label: string;
}

interface CompetitionHeaderProps {
  competition: Competition;
  language: string;
  t: (key: string, params?: Record<string, unknown>) => string;
  matchProgress: MatchProgress | null;
  showConfetti: boolean;
  showActionsMenu: boolean;
  setShowActionsMenu: React.Dispatch<React.SetStateAction<boolean>>;
  actionsMenuRef: React.RefObject<HTMLDivElement>;
  currentPhase: Phase;
  pools: Array<{ matches: Array<{ status: MatchStatus }> }>;
  tableauMatches: Array<unknown>;
  fencersCount: number;
  checkedInCount: number;
  setShowFencerComparison: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAnalytics: React.Dispatch<React.SetStateAction<boolean>>;
  setShowQRCode: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPresentation: React.Dispatch<React.SetStateAction<boolean>>;
  setShowKiosk: React.Dispatch<React.SetStateAction<boolean>>;
  setShowKioskDisplay: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPropertiesModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const CompetitionHeaderComponent: React.FC<CompetitionHeaderProps> = ({
  competition,
  language,
  t,
  matchProgress,
  showConfetti,
  showActionsMenu,
  setShowActionsMenu,
  actionsMenuRef,
  currentPhase,
  pools,
  tableauMatches,
  fencersCount,
  checkedInCount,
  setShowFencerComparison,
  setShowAnalytics,
  setShowQRCode,
  setShowPresentation,
  setShowKiosk,
  setShowKioskDisplay,
  setShowPropertiesModal,
}) => (
  <>
    <Confetti active={showConfetti} />
    {/* Header — glassmorphism redesign */}
    <div className="comp-header" style={{ '--comp-color': competition.color } as React.CSSProperties}>
      <div className="comp-header-bg" />
      <div className="comp-header-content">
        {/* Infos */}
        <div className="comp-header-info">
          <div className="comp-header-pills">
            <span className="comp-header-pill">{competition.weapon}</span>
            <span className="comp-header-pill">{competition.category}</span>
            <span className="comp-header-pill">{competition.gender}</span>
          </div>
          <h1 className="comp-header-title">{competition.title}</h1>
          <p className="comp-header-meta">
            {new Date(competition.date).toLocaleDateString(language === 'zh-HK' ? 'zh-HK' : language, {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
            {competition.location && ` · ${competition.location}`}
          </p>
        </div>

        {/* Stats + actions */}
        <div className="comp-header-right">
          {/* Stats */}
          <div className="comp-header-stats">
            <div className="comp-stat">
              <span className="comp-stat-value">{fencersCount}</span>
              <span className="comp-stat-label">{t('fencer.label')}</span>
            </div>
            <div className="comp-stat-sep" />
            <div className="comp-stat">
              <span className="comp-stat-value">{checkedInCount}</span>
              <span className="comp-stat-label">{t('fencer.present_label')}</span>
            </div>
            {matchProgress && (
              <>
                <div className="comp-stat-sep" />
                <div className="comp-stat">
                  <span className="comp-stat-value">{matchProgress.done}/{matchProgress.total}</span>
                  <span className="comp-stat-label">matchs</span>
                </div>
              </>
            )}
          </div>

          {/* Menu actions ⋯ */}
          <div className="comp-header-actions" ref={actionsMenuRef}>
            <CoachMark id="actions-menu" message="Comparaison, analytiques, partage QR..." position="left">
              <button
                className="comp-header-menu-btn"
                onClick={() => setShowActionsMenu(v => !v)}
                title="Actions"
              >
                ⋯
              </button>
            </CoachMark>
            {showActionsMenu && (
              <div className="comp-header-dropdown">
                <button className="comp-header-dropdown-item" onClick={() => { setShowFencerComparison(true); setShowActionsMenu(false); }}>
                  ⚔️ {t('competition.comparisons')}
                </button>
                <button className="comp-header-dropdown-item" onClick={() => { setShowAnalytics(true); setShowActionsMenu(false); }}>
                  📊 {t('competition.analytics')}
                </button>
                <button className="comp-header-dropdown-item" onClick={() => { setShowQRCode(true); setShowActionsMenu(false); }}>
                  📱 Partager
                </button>
                {currentPhase === 'pools' && pools.length > 0 && (
                  <>
                    <button className="comp-header-dropdown-item" onClick={() => { setShowPresentation(true); setShowActionsMenu(false); }}>
                      🖥️ Mode Présentation
                    </button>
                    <button className="comp-header-dropdown-item" onClick={() => { setShowKiosk(true); setShowActionsMenu(false); }}>
                      📱 Mode Kiosk
                    </button>
                  </>
                )}
                {(pools.length > 0 || tableauMatches.length > 0) && (
                  <button className="comp-header-dropdown-item" onClick={() => { setShowKioskDisplay(true); setShowActionsMenu(false); }}>
                    🖥️ Kiosk Public
                  </button>
                )}
                <div className="comp-header-dropdown-sep" />
                <button className="comp-header-dropdown-item" onClick={() => { setShowPropertiesModal(true); setShowActionsMenu(false); }}>
                  ⚙️ Propriétés
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barre de progression matchs */}
      {matchProgress && matchProgress.total > 0 && (
        <div className="comp-header-progress">
          <div
            className="comp-header-progress-fill"
            style={{ width: `${(matchProgress.done / matchProgress.total) * 100}%` }}
          />
        </div>
      )}
    </div>
  </>
);

const CompetitionHeader = React.memo(CompetitionHeaderComponent);
export default CompetitionHeader;
