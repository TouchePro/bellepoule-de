/**
 * BellePoule Modern - Pool View Component
 * With classic grid view and match list view
 * Licensed under GPL-3.0
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useModalResize } from '../hooks/useModalResize';
import { Pool, Fencer, MatchStatus, Score, Weapon, FencerStatus } from '../../shared/types';
import { logger, LogCategory } from '@shared/services/logger';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import { exportPoolToPDF } from '../../shared/utils/pdfExport';
import { useColumnVisibility, POOL_COLUMNS, ColumnId } from '../hooks/useColumnVisibility';
import { usePdfTemplateStore } from '../../features/pdfTemplates/hooks/usePdfTemplateStore';
import { useHistory } from '../hooks/useHistory';
import PoolScoreMatrix from './pool/PoolScoreMatrix';

interface PoolViewProps {
  pool: Pool;
  maxScore?: number;
  weapon?: Weapon;
  competitionName?: string;
  onScoreUpdate: (
    matchIndex: number,
    scoreA: number,
    scoreB: number,
    winnerOverride?: 'A' | 'B',
    specialStatus?: 'abandon' | 'forfait' | 'exclusion'
  ) => void;
  onMatchReset?: (matchIndex: number) => void;
  onMatchCancel?: (matchIndex: number) => void;
  onFencerChangePool?: (fencer: Fencer) => void;
  onFencerStatusChange?: (fencerId: string, status: 'abandon' | 'forfait' | 'exclusion') => void;
}

type ViewMode = 'grid' | 'matches';

const PoolViewComponent: React.FC<PoolViewProps> = ({
  pool,
  maxScore = 5,
  weapon,
  competitionName,
  onScoreUpdate,
  onMatchReset,
  onMatchCancel,
  onFencerChangePool,
  onFencerStatusChange,
}) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { isColumnVisible, toggleColumn, getVisibleColumns } = useColumnVisibility();
  const poolTemplate = usePdfTemplateStore(s => s.templates.pool);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [isMatchInverted, setIsMatchInverted] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [editScoreA, setEditScoreA] = useState('');
  const [editScoreB, setEditScoreB] = useState('');
  const [victoryA, setVictoryA] = useState(false);
  const [victoryB, setVictoryB] = useState(false);
  const [matchesUpdateTrigger, setMatchesUpdateTrigger] = useState(0);
  const [keyboardFocusField, setKeyboardFocusField] = useState<'A' | 'B'>('A');

  const { addAction, undo, redo, canUndo, canRedo } = useHistory();

  const isLaserSabre = weapon === Weapon.LASER;
  const fencers = pool.fencers;

  const isVisible = useCallback(
    (columnId: ColumnId): boolean => {
      if (columnId === 'quest' && !isLaserSabre) return false;
      return isColumnVisible('pool', columnId);
    },
    [isLaserSabre, isColumnVisible]
  );

  const columnMenuRef = useRef<HTMLDivElement>(null);
  const handleScoreSubmitRef = useRef<() => void>(() => {});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    if (showColumnMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnMenu]);

  // Raccourcis clavier

  const orderedMatches = useMemo(() => {
    const cancelled = pool.matches
      .map((m, idx) => ({ match: m, index: idx }))
      .filter(({ match }) => match.status === MatchStatus.CANCELLED);

    const pending = pool.matches
      .map((m, idx) => ({ match: m, index: idx }))
      .filter(({ match }) => match.status !== MatchStatus.FINISHED && match.status !== MatchStatus.CANCELLED);

    const finished = pool.matches
      .map((m, idx) => ({ match: m, index: idx }))
      .filter(({ match }) => match.status === MatchStatus.FINISHED);

    if (pending.length === 0) return { pending: [], finished, cancelled };

    // Algorithme pour éviter qu'un tireur combatte 2 fois d'affilée
    const ordered: typeof pending = [];
    const remaining = [...pending];
    let lastFencerIds: Set<string> = new Set();

    // Si des matchs ont déjà été joués, récupérer les derniers combattants
    if (finished.length > 0) {
      const lastMatch = finished[finished.length - 1].match;
      if (lastMatch.fencerA) lastFencerIds.add(lastMatch.fencerA.id);
      if (lastMatch.fencerB) lastFencerIds.add(lastMatch.fencerB.id);
    }

    while (remaining.length > 0) {
      // Chercher un match où aucun des deux tireurs n'a combattu au dernier tour
      let bestIdx = -1;
      let bestScore = -1;

      for (let i = 0; i < remaining.length; i++) {
        const { match } = remaining[i];
        const fencerAId = match.fencerA?.id || '';
        const fencerBId = match.fencerB?.id || '';

        let score = 0;
        if (!lastFencerIds.has(fencerAId)) score++;
        if (!lastFencerIds.has(fencerBId)) score++;

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }

        // Score parfait (2) = aucun des deux n'a combattu
        if (score === 2) break;
      }

      // Prendre le meilleur match trouvé (ou le premier si aucun idéal)
      const chosenIdx = bestIdx >= 0 ? bestIdx : 0;
      const chosen = remaining.splice(chosenIdx, 1)[0];
      ordered.push(chosen);

      // Mettre à jour les derniers combattants
      lastFencerIds = new Set();
      if (chosen.match.fencerA) lastFencerIds.add(chosen.match.fencerA.id);
      if (chosen.match.fencerB) lastFencerIds.add(chosen.match.fencerB.id);
    }

    return { pending: ordered, finished, cancelled };
  }, [pool.matches.length, pool.matches.map(m => m.status).join(',')]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ne pas interférer si un input natif est actif (sauf ceux du modal)
      const target = e.target as HTMLElement;
      const inModalInput = target.tagName === 'INPUT' && target.closest('.modal');

      if (editingMatch !== null) {
        // Modal ouvert
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditingMatch(null);
          setIsMatchInverted(false);
          setKeyboardFocusField('A');
          return;
        }
        if (e.key === 'Enter' && !inModalInput) {
          e.preventDefault();
          handleScoreSubmitRef.current();
          return;
        }
        if (e.key === 'Tab' && !inModalInput) {
          e.preventDefault();
          setKeyboardFocusField(prev => (prev === 'A' ? 'B' : 'A'));
          return;
        }
        if ((e.key === 'v' || e.key === 'V') && isLaserSabre && !inModalInput) {
          e.preventDefault();
          if (keyboardFocusField === 'A') {
            setVictoryA(prev => !prev);
            setVictoryB(false);
          } else {
            setVictoryB(prev => !prev);
            setVictoryA(false);
          }
          return;
        }
        if (/^\d$/.test(e.key) && !inModalInput) {
          e.preventDefault();
          const digit = e.key;
          if (keyboardFocusField === 'A') {
            setEditScoreA(prev => (prev.length < 2 ? prev + digit : digit));
          } else {
            setEditScoreB(prev => (prev.length < 2 ? prev + digit : digit));
          }
          return;
        }
      } else {
        // Modal fermé
        if (
          (e.key === 'n' || e.key === 'N') &&
          !inModalInput &&
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          const firstPending = orderedMatches.pending[0];
          if (firstPending) {
            openScoreModal(firstPending.index);
            setKeyboardFocusField('A');
          }
          return;
        }
        if (e.key === 'z' && e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if (
          (e.key === 'y' && e.ctrlKey) ||
          (e.key === 'z' && e.ctrlKey && e.shiftKey) ||
          (e.key === 'Z' && e.ctrlKey && e.shiftKey)
        ) {
          e.preventDefault();
          redo();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingMatch, keyboardFocusField, isLaserSabre, orderedMatches.pending, undo, redo]);

  // Calculer l'ordre optimal des matches restants

  const getMatchIndex = (fencerA: Fencer, fencerB: Fencer): number => {
    return pool.matches.findIndex(
      m =>
        (m.fencerA?.id === fencerA.id && m.fencerB?.id === fencerB.id) ||
        (m.fencerA?.id === fencerB.id && m.fencerB?.id === fencerA.id)
    );
  };

  const { modalRef, dimensions } = useModalResize({
    defaultWidth: 1440, // Doublé de 720 à 1440 (+100%)
    defaultHeight: 400,
    minWidth: 960, // Doublé de 480 à 960 (+100%)
    minHeight: 300,
  });

  const openScoreModal = (matchIndex: number, inverted = false) => {
    const match = pool.matches[matchIndex];
    setEditingMatch(matchIndex);
    setIsMatchInverted(inverted);
    setEditScoreA(
      inverted ? match.scoreB?.value?.toString() || '' : match.scoreA?.value?.toString() || ''
    );
    setEditScoreB(
      inverted ? match.scoreA?.value?.toString() || '' : match.scoreB?.value?.toString() || ''
    );
    // Restaurer la victoire existante (ex: match déjà saisi par tirage au sort)
    setVictoryA(!inverted ? !!match.scoreA?.isVictory : !!match.scoreB?.isVictory);
    setVictoryB(!inverted ? !!match.scoreB?.isVictory : !!match.scoreA?.isVictory);
  };

  const handleCellClick = (rowFencer: Fencer, colFencer: Fencer) => {
    if (rowFencer.id === colFencer.id) return;
    const matchIndex = getMatchIndex(rowFencer, colFencer);
    if (matchIndex === -1) return;
    const match = pool.matches[matchIndex];
    // Inversion si le tireur de la ligne est fencerB (pour l'afficher à gauche)
    const inverted = match.fencerA?.id === colFencer.id;
    openScoreModal(matchIndex, inverted);
  };

  const handleScoreSubmit = () => {
    if (editingMatch === null) return;

    const scoreLeft = parseInt(editScoreA, 10) || 0;
    const scoreRight = parseInt(editScoreB, 10) || 0;

    // Valider que les scores ne dépassent pas le maximum
    // Utiliser le maxScore stocké sur le match comme référence, avec fallback sur la prop
    const effectiveMax = pool.matches[editingMatch]?.maxScore || maxScore || 0;
    if (effectiveMax > 0) {
      if (scoreLeft > effectiveMax) {
        showToast(`Le score du tireur A ne peut pas dépasser ${effectiveMax}`, 'error');
        return;
      }
      if (scoreRight > effectiveMax) {
        showToast(`Le score du tireur B ne peut pas dépasser ${effectiveMax}`, 'error');
        return;
      }
    }

    // Remettre dans l'ordre fencerA/fencerB du match si la vue est inversée
    const actualScoreA = isMatchInverted ? scoreRight : scoreLeft;
    const actualScoreB = isMatchInverted ? scoreLeft : scoreRight;

    // Capturer l'ancien score pour l'historique
    const match = pool.matches[editingMatch];
    const prevScoreA =
      typeof match?.scoreA === 'number' ? match.scoreA : ((match?.scoreA as any)?.value ?? null);
    const prevScoreB =
      typeof match?.scoreB === 'number' ? match.scoreB : ((match?.scoreB as any)?.value ?? null);
    const matchIdx = editingMatch;

    if (actualScoreA === actualScoreB) {
      if (isLaserSabre && (victoryA || victoryB)) {
        // victoryA = victoire du tireur affiché à gauche (= fencerA si normal, fencerB si inversé)
        const winnerLeft = victoryA;
        const winner: 'A' | 'B' = isMatchInverted
          ? winnerLeft
            ? 'B'
            : 'A'
          : winnerLeft
            ? 'A'
            : 'B';
        addAction({
          type: 'UPDATE_SCORE',
          description: `Score poule ${pool.number} match ${matchIdx + 1}`,
          undo: () => {
            if (prevScoreA !== null && prevScoreB !== null)
              onScoreUpdate(matchIdx, prevScoreA, prevScoreB);
          },
          redo: () => {
            onScoreUpdate(matchIdx, actualScoreA, actualScoreB, winner);
          },
        });
        onScoreUpdate(editingMatch, actualScoreA, actualScoreB, winner);
      } else if (isLaserSabre) {
        showToast('Match nul : cliquez sur V pour attribuer la victoire', 'warning');
        return;
      } else if (victoryA || victoryB) {
        // Tirage au sort déjà décidé (ex: résultat importé depuis une tablette arbitre)
        const winnerLeft = victoryA;
        const winner: 'A' | 'B' = isMatchInverted
          ? winnerLeft ? 'B' : 'A'
          : winnerLeft ? 'A' : 'B';
        addAction({
          type: 'UPDATE_SCORE',
          description: `Score poule ${pool.number} match ${matchIdx + 1}`,
          undo: () => {
            if (prevScoreA !== null && prevScoreB !== null)
              onScoreUpdate(matchIdx, prevScoreA, prevScoreB);
          },
          redo: () => {
            onScoreUpdate(matchIdx, actualScoreA, actualScoreB, winner);
          },
        });
        onScoreUpdate(editingMatch, actualScoreA, actualScoreB, winner);
      } else {
        showToast(
          "Match nul impossible ! En match en direct, la mort subite de 30s s'applique automatiquement",
          'error'
        );
        return;
      }
    } else {
      addAction({
        type: 'UPDATE_SCORE',
        description: `Score poule ${pool.number} match ${matchIdx + 1}`,
        undo: () => {
          if (prevScoreA !== null && prevScoreB !== null)
            onScoreUpdate(matchIdx, prevScoreA, prevScoreB);
        },
        redo: () => {
          onScoreUpdate(matchIdx, actualScoreA, actualScoreB);
        },
      });
      onScoreUpdate(editingMatch, actualScoreA, actualScoreB);
    }

    // Forcer la mise à jour de l'ordre des matchs
    setMatchesUpdateTrigger(prev => prev + 1);

    // Fermer le modal immédiatement après la mise à jour
    setEditingMatch(null);
    setIsMatchInverted(false);
    setEditScoreA('');
    setEditScoreB('');
    setVictoryA(false);
    setVictoryB(false);
  };

  // Mettre à jour la ref avec la fonction actuelle
  handleScoreSubmitRef.current = handleScoreSubmit;

  const handleSpecialStatus = async (status: 'abandon' | 'forfait' | 'exclusion') => {
    if (editingMatch === null) return;

    const match = pool.matches[editingMatch];
    // Respecter l'ordre d'affichage : le tireur affiché à gauche est "fencerLeft"
    const fencerLeft = isMatchInverted ? match.fencerB : match.fencerA;
    const fencerRight = isMatchInverted ? match.fencerA : match.fencerB;

    const statusVerb =
      status === 'abandon' ? 'abandonne' : status === 'forfait' ? 'déclare forfait' : 'est exclu';
    const statusInf =
      status === 'abandon' ? 'abandonner' : status === 'forfait' ? 'déclarer forfait' : 'exclure';
    const leftAbandons = await confirm({
      message: `${fencerLeft?.lastName} ${fencerLeft?.firstName?.charAt(0)}. ${statusVerb} ?\n\nCliquez sur Annuler pour ${statusInf} ${fencerRight?.lastName} ${fencerRight?.firstName?.charAt(0)}.`,
      confirmLabel: `${fencerLeft?.lastName}`,
      cancelLabel: `${fencerRight?.lastName}`,
    });

    if (leftAbandons) {
      // Le tireur affiché à gauche abandonne
      const winner: 'A' | 'B' = isMatchInverted ? 'A' : 'B';
      onScoreUpdate(
        editingMatch,
        isMatchInverted ? match.scoreA?.value || maxScore : 0,
        isMatchInverted ? 0 : match.scoreB?.value || maxScore,
        winner,
        status
      );
      if (onFencerStatusChange && fencerLeft) {
        onFencerStatusChange(fencerLeft.id, status);
      }
    } else {
      // Le tireur affiché à droite abandonne
      const winner: 'A' | 'B' = isMatchInverted ? 'B' : 'A';
      onScoreUpdate(
        editingMatch,
        isMatchInverted ? 0 : match.scoreA?.value || maxScore,
        isMatchInverted ? match.scoreB?.value || maxScore : 0,
        winner,
        status
      );
      if (onFencerStatusChange && fencerRight) {
        onFencerStatusChange(fencerRight.id, status);
      }
    }

    // Forcer la mise à jour de l'ordre des matchs
    setMatchesUpdateTrigger(prev => prev + 1);

    // Fermer le modal immédiatement après la mise à jour
    setEditingMatch(null);
    setIsMatchInverted(false);
    setEditScoreA('');
    setEditScoreB('');
    setVictoryA(false);
    setVictoryB(false);
  };

  const finishedCount = useMemo(
    () => pool.matches.filter(m => m.status === MatchStatus.FINISHED).length,
    [pool.matches]
  );
  const totalMatches = pool.matches.length;

  // Export PDF function
  const handleExportPDF = async () => {
    try {
      const logo = localStorage.getItem('bellepoule-logo') ?? undefined;
      await exportPoolToPDF(
        pool,
        {
          title: `Poule ${pool.number} - ${pool.fencers.length} tireurs`,
          includeFinishedMatches: true,
          includePendingMatches: true,
          includePoolStats: true,
          logoBase64: logo,
          competitionName,
          visibleColumns: getVisibleColumns('pool'),
        },
        poolTemplate
      );
      showToast(`Export PDF de la poule ${pool.number} généré avec succès`, 'success');
    } catch (error) {
      logger.error(LogCategory.UI, "Erreur lors de l'export PDF", error as Error);
      showToast(
        `Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        'error'
      );
    }
  };

  // Fonction pour remplir automatiquement tous les scores de la poule (pour les tests)
  const handleAutoFillScores = async () => {
    const confirmed = await confirm({
      message:
        'Remplir automatiquement tous les scores des matchs non terminés ?\n\nLes scores seront générés aléatoirement pour les tests.',
      confirmLabel: 'Remplir',
      cancelLabel: 'Annuler',
    });

    if (!confirmed) return;

    const pendingMatches = pool.matches
      .map((match, index) => ({ match, index }))
      .filter(({ match }) => match.status !== MatchStatus.FINISHED);

    if (pendingMatches.length === 0) {
      showToast('Tous les matchs sont déjà terminés', 'info');
      return;
    }

    for (const { index } of pendingMatches) {
      // Générer des scores aléatoires
      const scoreA = Math.floor(Math.random() * (maxScore + 1));
      const scoreB = Math.floor(Math.random() * (maxScore + 1));

      // Si les scores sont égaux
      if (scoreA === scoreB) {
        if (isLaserSabre) {
          // En sabre laser, désigner un vainqueur aléatoire en cas d'égalité
          const winnerOverride = Math.random() > 0.5 ? 'A' : 'B';
          onScoreUpdate(index, scoreA, scoreB, winnerOverride);
        } else {
          // En escrime classique, éviter l'égalité
          if (scoreA === 0) {
            // Si les deux sont à 0, mettre l'un à 1
            onScoreUpdate(index, 1, 0);
          } else {
            // Sinon, donner la victoire à un des deux aléatoirement
            if (Math.random() > 0.5) {
              onScoreUpdate(index, scoreA + 1, scoreB);
            } else {
              onScoreUpdate(index, scoreA, scoreB + 1);
            }
          }
        }
      } else {
        // Scores différents : désigner le vainqueur explicitement
        const winnerOverride: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B';
        onScoreUpdate(index, scoreA, scoreB, winnerOverride);
      }
    }

    setMatchesUpdateTrigger(prev => prev + 1);
    showToast(`Scores générés pour ${pendingMatches.length} match(s)`, 'success');
  };

  // Render Score Modal
  const renderScoreModal = () => {
    if (editingMatch === null) return null;

    const match = pool.matches[editingMatch];

    return (
      <div
        className="modal-overlay"
        onClick={() => {
          setEditingMatch(null);
          setIsMatchInverted(false);
        }}
      >
        <div
          ref={modalRef}
          className="modal resizable"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '900px', width: '95%', minHeight: '400px' }}
        >
          <div className="modal-header" style={{ cursor: 'move' }}>
            <h3 className="modal-title">Saisie rapide du score</h3>
          </div>
          <div className="modal-body" style={{ padding: '2rem' }}>
            {/* Ligne unique avec les deux tireurs côte à côte */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              {/* Tireur gauche (ligne dans la grille) */}
              {(() => {
                const f = isMatchInverted ? match.fencerB : match.fencerA;
                return (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      flex: 1,
                      minWidth: '200px',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, textAlign: 'right' }}>
                      {f?.lastName}
                    </div>
                    <div style={{ fontSize: '1rem', color: '#6b7280', textAlign: 'right' }}>
                      {f?.firstName} {f?.club && `(${f.club})`}
                    </div>
                  </div>
                );
              })()}

              {/* Bouton Victoire Sabre Laser A */}
              {isLaserSabre && (
                <button
                  type="button"
                  onClick={() => {
                    setVictoryA(!victoryA);
                    setVictoryB(false);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: victoryA ? '#22c55e' : '#e5e7eb',
                    color: victoryA ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                  }}
                >
                  V
                </button>
              )}

              {/* Input Score A */}
              <input
                type="number"
                className="form-input"
                style={{
                  width: '120px',
                  textAlign: 'center',
                  fontSize: '3rem',
                  padding: '0.75rem',
                  borderColor:
                    (parseInt(editScoreA, 10) || 0) >
                    ((editingMatch !== null ? pool.matches[editingMatch]?.maxScore : 0) ||
                      maxScore ||
                      999)
                      ? '#ef4444'
                      : undefined,
                  borderWidth:
                    (parseInt(editScoreA, 10) || 0) >
                    ((editingMatch !== null ? pool.matches[editingMatch]?.maxScore : 0) ||
                      maxScore ||
                      999)
                      ? '2px'
                      : undefined,
                }}
                value={editScoreA}
                onChange={e => setEditScoreA(e.target.value)}
                min="0"
                max={
                  (editingMatch !== null ? pool.matches[editingMatch]?.maxScore : 0) ||
                  maxScore ||
                  undefined
                }
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScoreSubmitRef.current();
                  } else if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    const modalBody = e.currentTarget.closest('.modal-body');
                    if (modalBody) {
                      const inputs = modalBody.querySelectorAll('input[type="number"]');
                      if (inputs.length > 1) {
                        const nextInput = inputs[1] as HTMLInputElement;
                        nextInput.focus();
                        nextInput.select();
                      }
                    }
                  }
                }}
              />

              {/* Séparateur */}
              <span style={{ fontSize: '3rem', fontWeight: 'bold', color: '#9ca3af' }}>:</span>

              {/* Input Score B */}
              <input
                type="number"
                className="form-input"
                style={{
                  width: '120px',
                  textAlign: 'center',
                  fontSize: '3rem',
                  padding: '0.75rem',
                  borderColor:
                    (parseInt(editScoreB, 10) || 0) >
                    ((editingMatch !== null ? pool.matches[editingMatch]?.maxScore : 0) ||
                      maxScore ||
                      999)
                      ? '#ef4444'
                      : undefined,
                  borderWidth:
                    (parseInt(editScoreB, 10) || 0) >
                    ((editingMatch !== null ? pool.matches[editingMatch]?.maxScore : 0) ||
                      maxScore ||
                      999)
                      ? '2px'
                      : undefined,
                }}
                value={editScoreB}
                onChange={e => setEditScoreB(e.target.value)}
                min="0"
                max={
                  (editingMatch !== null ? pool.matches[editingMatch]?.maxScore : 0) ||
                  maxScore ||
                  undefined
                }
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScoreSubmitRef.current();
                  } else if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    const modalBody = e.currentTarget.closest('.modal-body');
                    if (modalBody) {
                      const inputs = modalBody.querySelectorAll('input[type="number"]');
                      if (inputs.length > 0) {
                        const prevInput = inputs[0] as HTMLInputElement;
                        prevInput.focus();
                        prevInput.select();
                      }
                    }
                  }
                }}
              />

              {/* Bouton Victoire Sabre Laser B */}
              {isLaserSabre && (
                <button
                  type="button"
                  onClick={() => {
                    setVictoryB(!victoryB);
                    setVictoryA(false);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: victoryB ? '#22c55e' : '#e5e7eb',
                    color: victoryB ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                  }}
                >
                  V
                </button>
              )}

              {/* Tireur droite (colonne dans la grille) */}
              {(() => {
                const f = isMatchInverted ? match.fencerA : match.fencerB;
                return (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      flex: 1,
                      minWidth: '200px',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, textAlign: 'left' }}>
                      {f?.lastName}
                    </div>
                    <div style={{ fontSize: '1rem', color: '#6b7280', textAlign: 'left' }}>
                      {f?.firstName} {f?.club && `(${f.club})`}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Info égalité sabre laser */}
            {isLaserSabre && (
              <p
                className="text-sm text-muted"
                style={{ textAlign: 'center', marginBottom: '1rem' }}
              >
                💡 En cas d'égalité, cliquez sur V pour attribuer la victoire
              </p>
            )}

            {/* Boutons spéciaux sur une ligne */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '1rem',
                marginTop: '0.5rem',
              }}
            >
              <button
                className="btn btn-warning"
                onClick={() => handleSpecialStatus('abandon')}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                🚴 Abandon
              </button>
              <button
                className="btn btn-warning"
                onClick={() => handleSpecialStatus('forfait')}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                📋 Forfait
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleSpecialStatus('exclusion')}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                🚫 Exclusion
              </button>
              {onMatchCancel && editingMatch !== null && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (editingMatch === null) return;
                    onMatchCancel(editingMatch);
                    setEditingMatch(null);
                    setIsMatchInverted(false);
                    setEditScoreA('');
                    setEditScoreB('');
                    setVictoryA(false);
                    setVictoryB(false);
                  }}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  ⏸ Annuler match
                </button>
              )}
            </div>
          </div>
          <div
            className="modal-footer"
            style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => {
                setEditingMatch(null);
                setIsMatchInverted(false);
              }}
            >
              Annuler
            </button>
            <button className="btn btn-primary" onClick={handleScoreSubmit}>
              Valider
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Grid View
  const renderGridView = () => (
    <PoolScoreMatrix
      pool={pool}
      isLaserSabre={isLaserSabre}
      isVisible={isVisible}
      toggleColumn={toggleColumn}
      onCellClick={handleCellClick}
      onFencerChangePool={onFencerChangePool}
      onMatchReset={onMatchReset ? (rowFencer, colFencer) => {
        const matchIndex = getMatchIndex(rowFencer, colFencer);
        if (matchIndex !== -1) onMatchReset(matchIndex);
      } : undefined}
    />
  );

  // Composant Prochain Match réutilisable
  const renderNextMatch = () => {
    if (orderedMatches.pending.length === 0) return null;

    const nextMatch = orderedMatches.pending[0];

    // Vérifier si l'un des tireurs a abandonné
    const fencerAAbandoned =
      nextMatch.match.fencerA?.status === FencerStatus.ABANDONED ||
      nextMatch.match.fencerA?.status === FencerStatus.FORFAIT ||
      nextMatch.match.fencerA?.status === FencerStatus.EXCLUDED;
    const fencerBAbandoned =
      nextMatch.match.fencerB?.status === FencerStatus.ABANDONED ||
      nextMatch.match.fencerB?.status === FencerStatus.FORFAIT ||
      nextMatch.match.fencerB?.status === FencerStatus.EXCLUDED;
    const isAbandonMatch = fencerAAbandoned || fencerBAbandoned;

    if (isAbandonMatch) {
      return (
        <div
          style={{
            background: '#6b7280',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem',
            color: 'white',
            opacity: 0.7,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>
              ✕ Match non disputé
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontWeight: '600',
                  textDecoration: fencerAAbandoned ? 'line-through' : 'none',
                }}
              >
                {nextMatch.match.fencerA?.lastName} {nextMatch.match.fencerA?.firstName?.charAt(0)}.
                {fencerAAbandoned && ' ✕'}
              </span>
              <span style={{ opacity: 0.7 }}>vs</span>
              <span
                style={{
                  fontWeight: '600',
                  textDecoration: fencerBAbandoned ? 'line-through' : 'none',
                }}
              >
                {nextMatch.match.fencerB?.lastName} {nextMatch.match.fencerB?.firstName?.charAt(0)}.
                {fencerBAbandoned && ' ✕'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>
            ⚔️ Prochain match
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <span style={{ fontWeight: '600' }}>
              {nextMatch.match.fencerA?.lastName} {nextMatch.match.fencerA?.firstName?.charAt(0)}.
              {nextMatch.match.fencerA?.ranking && ` #${nextMatch.match.fencerA.ranking}`}
            </span>
            <span style={{ opacity: 0.7 }}>vs</span>
            <span style={{ fontWeight: '600' }}>
              {nextMatch.match.fencerB?.lastName} {nextMatch.match.fencerB?.firstName?.charAt(0)}.
              {nextMatch.match.fencerB?.ranking && ` #${nextMatch.match.fencerB.ranking}`}
            </span>
          </div>
          <button
            onClick={() => openScoreModal(nextMatch.index)}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem',
            }}
          >
            Saisir
          </button>
        </div>
      </div>
    );
  };

  // Render Match List View
  const renderMatchListView = () => (
    <div>
      {/* Prochain match en gros */}
      {orderedMatches.pending.length > 0 &&
        (() => {
          const nextMatch = orderedMatches.pending[0];
          const fencerAAbandoned =
            nextMatch.match.fencerA?.status === FencerStatus.ABANDONED ||
            nextMatch.match.fencerA?.status === FencerStatus.FORFAIT ||
            nextMatch.match.fencerA?.status === FencerStatus.EXCLUDED;
          const fencerBAbandoned =
            nextMatch.match.fencerB?.status === FencerStatus.ABANDONED ||
            nextMatch.match.fencerB?.status === FencerStatus.FORFAIT ||
            nextMatch.match.fencerB?.status === FencerStatus.EXCLUDED;
          const isAbandonMatch = fencerAAbandoned || fencerBAbandoned;

          if (isAbandonMatch) {
            return (
              <div
                style={{
                  background: '#6b7280',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                  color: 'white',
                  opacity: 0.7,
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    opacity: 0.8,
                    marginBottom: '0.5rem',
                  }}
                >
                  ✕ Match non disputé
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        textDecoration: fencerAAbandoned ? 'line-through' : 'none',
                      }}
                    >
                      {nextMatch.match.fencerA?.lastName}
                      {fencerAAbandoned && ' ✕'}
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                      {nextMatch.match.fencerA?.firstName}
                    </div>
                  </div>
                  <div style={{ padding: '0 1rem', fontSize: '1.25rem', fontWeight: '600' }}>
                    vs
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        textDecoration: fencerBAbandoned ? 'line-through' : 'none',
                      }}
                    >
                      {nextMatch.match.fencerB?.lastName}
                      {fencerBAbandoned && ' ✕'}
                    </div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                      {nextMatch.match.fencerB?.firstName}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1rem',
                color: 'white',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  opacity: 0.8,
                  marginBottom: '0.5rem',
                }}
              >
                ⚔️ Prochain match
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                    {orderedMatches.pending[0].match.fencerA?.lastName}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    {orderedMatches.pending[0].match.fencerA?.firstName}
                  </div>
                </div>
                <div style={{ padding: '0 1rem', fontSize: '1.25rem', fontWeight: '600' }}>VS</div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                    {orderedMatches.pending[0].match.fencerB?.lastName}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    {orderedMatches.pending[0].match.fencerB?.firstName}
                  </div>
                </div>
              </div>
              <button
                onClick={() => openScoreModal(orderedMatches.pending[0].index)}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🎯 Saisir le score
              </button>
            </div>
          );
        })()}

      {/* Matches restants */}
      {orderedMatches.pending.length > 1 && (
        <div style={{ marginBottom: '1rem' }}>
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#6b7280',
            }}
          >
            Matches à venir ({orderedMatches.pending.length - 1})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {orderedMatches.pending.slice(1).map(({ match, index }, i) => {
              // Vérifier si l'un des tireurs a abandonné
              const fencerAAbandoned =
                match.fencerA?.status === FencerStatus.ABANDONED ||
                match.fencerA?.status === FencerStatus.FORFAIT ||
                match.fencerA?.status === FencerStatus.EXCLUDED;
              const fencerBAbandoned =
                match.fencerB?.status === FencerStatus.ABANDONED ||
                match.fencerB?.status === FencerStatus.FORFAIT ||
                match.fencerB?.status === FencerStatus.EXCLUDED;
              const isAbandonMatch = fencerAAbandoned || fencerBAbandoned;

              return (
                <div
                  key={index}
                  onClick={() => !isAbandonMatch && openScoreModal(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: isAbandonMatch ? '#e5e7eb' : '#f9fafb',
                    borderRadius: '6px',
                    cursor: isAbandonMatch ? 'not-allowed' : 'pointer',
                    border: isAbandonMatch ? '1px dashed #9ca3af' : '1px solid #e5e7eb',
                    opacity: isAbandonMatch ? 0.5 : 1,
                  }}
                >
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem', minWidth: '30px' }}>
                    #{i + 2}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontWeight: '500',
                      textDecoration: fencerAAbandoned ? 'line-through' : 'none',
                      color: fencerAAbandoned ? '#9ca3af' : 'inherit',
                    }}
                  >
                    {match.fencerA?.lastName}
                    {fencerAAbandoned && ' ✕'}
                  </span>
                  <span style={{ color: '#9ca3af', padding: '0 0.5rem' }}>
                    {isAbandonMatch ? '✕' : 'vs'}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'right',
                      fontWeight: '500',
                      textDecoration: fencerBAbandoned ? 'line-through' : 'none',
                      color: fencerBAbandoned ? '#9ca3af' : 'inherit',
                    }}
                  >
                    {match.fencerB?.lastName}
                    {fencerBAbandoned && ' ✕'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Matches terminés */}
      {orderedMatches.finished.length > 0 && (
        <div>
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#6b7280',
            }}
          >
            Matches terminés ({orderedMatches.finished.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {orderedMatches.finished.map(({ match, index }) => {
              // Vérifier si c'est un match avec abandon/forfait
              const fencerAAbandoned =
                match.fencerA?.status === FencerStatus.ABANDONED ||
                match.fencerA?.status === FencerStatus.FORFAIT ||
                match.fencerA?.status === FencerStatus.EXCLUDED;
              const fencerBAbandoned =
                match.fencerB?.status === FencerStatus.ABANDONED ||
                match.fencerB?.status === FencerStatus.FORFAIT ||
                match.fencerB?.status === FencerStatus.EXCLUDED;
              const isAbandonMatch = fencerAAbandoned || fencerBAbandoned;

              return (
                <div
                  key={index}
                  onClick={() => !isAbandonMatch && openScoreModal(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: isAbandonMatch
                      ? '#e5e7eb'
                      : match.scoreA?.isVictory
                        ? '#f0fdf4'
                        : '#fef2f2',
                    borderRadius: '6px',
                    cursor: isAbandonMatch ? 'not-allowed' : 'pointer',
                    border: isAbandonMatch ? '1px dashed #9ca3af' : '1px solid #e5e7eb',
                    opacity: isAbandonMatch ? 0.5 : 1,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontWeight: match.scoreA?.isVictory ? '600' : '400',
                      color: isAbandonMatch
                        ? '#9ca3af'
                        : match.scoreA?.isVictory
                          ? '#16a34a'
                          : '#6b7280',
                      textDecoration: fencerAAbandoned ? 'line-through' : 'none',
                    }}
                  >
                    {match.scoreA?.isVictory ? '✓ ' : ''}
                    {match.fencerA?.lastName}
                    {fencerAAbandoned && ' ✕'}
                  </span>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: isAbandonMatch ? '#e5e7eb' : 'white',
                      borderRadius: '4px',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      color: isAbandonMatch ? '#9ca3af' : 'inherit',
                    }}
                  >
                    {isAbandonMatch ? (
                      '✕ Non disputé'
                    ) : (
                      <>
                        {match.scoreA?.isVictory ? 'V' : ''}
                        {match.scoreA?.value} - {match.scoreB?.isVictory ? 'V' : ''}
                        {match.scoreB?.value}
                      </>
                    )}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'right',
                      fontWeight: match.scoreB?.isVictory ? '600' : '400',
                      color: isAbandonMatch
                        ? '#9ca3af'
                        : match.scoreB?.isVictory
                          ? '#16a34a'
                          : '#6b7280',
                      textDecoration: fencerBAbandoned ? 'line-through' : 'none',
                    }}
                  >
                    {match.fencerB?.lastName}
                    {fencerBAbandoned && ' ✕'}
                    {match.scoreB?.isVictory && !isAbandonMatch ? ' ✓' : ''}
                  </span>
                  {!isAbandonMatch && onMatchReset && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onMatchReset(index);
                      }}
                      title="Annuler ce résultat"
                      style={{
                        marginLeft: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#dc2626',
                        flexShrink: 0,
                      }}
                    >
                      ↺
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Matches annulés */}
      {orderedMatches.cancelled.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>
            Matches annulés ({orderedMatches.cancelled.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {orderedMatches.cancelled.map(({ match, index }) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: '#f3f4f6',
                  borderRadius: '6px',
                  border: '1px dashed #d1d5db',
                  opacity: 0.8,
                }}
              >
                <span style={{ color: '#9ca3af', fontSize: '0.875rem', minWidth: '30px' }}>⏸</span>
                <span style={{ flex: 1, textAlign: 'center', color: '#6b7280', textDecoration: 'line-through' }}>
                  {match.fencerA?.lastName} vs {match.fencerB?.lastName}
                </span>
                {onMatchReset && (
                  <button
                    onClick={() => onMatchReset(index)}
                    title="Relancer ce match"
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      background: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#2563eb',
                      flexShrink: 0,
                    }}
                  >
                    ▶ Relancer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Poule terminée */}
      {orderedMatches.pending.length === 0 && orderedMatches.cancelled.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏁</div>
          <div style={{ fontWeight: '600' }}>Poule terminée !</div>
          <div style={{ fontSize: '0.875rem' }}>Tous les matches ont été joués</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="card">
      <div
        className="card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>Poule {pool.number}</span>
          <span className={`badge ${pool.isComplete ? 'badge-success' : 'badge-warning'}`}>
            {pool.isComplete ? 'Terminée' : `${finishedCount}/${totalMatches}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              padding: '0.375rem 0.6rem',
              fontSize: '0.8rem',
              background: canUndo ? '#6b7280' : '#e5e7eb',
              color: canUndo ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '4px',
              cursor: canUndo ? 'pointer' : 'not-allowed',
            }}
            title="Annuler (Ctrl+Z)"
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              padding: '0.375rem 0.6rem',
              fontSize: '0.8rem',
              background: canRedo ? '#6b7280' : '#e5e7eb',
              color: canRedo ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '4px',
              cursor: canRedo ? 'pointer' : 'not-allowed',
            }}
            title="Rétablir (Ctrl+Y)"
          >
            ↪
          </button>
          <button
            onClick={handleAutoFillScores}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="Remplir automatiquement les scores (test)"
          >
            🎲 Auto
          </button>
          <button
            onClick={handleExportPDF}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="Exporter la pôle en PDF"
          >
            📄 PDF
          </button>
          <div style={{ position: 'relative' }} ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                background: showColumnMenu ? '#6b7280' : '#e5e7eb',
                color: showColumnMenu ? 'white' : '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Afficher/masquer les colonnes"
            >
              ⚙️
            </button>
            {showColumnMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.25rem',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 100,
                  minWidth: '180px',
                  padding: '0.5rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    marginBottom: '0.25rem',
                  }}
                >
                  Colonnes à afficher
                </div>
                {POOL_COLUMNS.filter(col => col.id !== 'quest' || isLaserSabre).map(col => (
                  <label
                    key={col.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.375rem 0.5rem',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <input
                      type="checkbox"
                      checked={isVisible(col.id)}
                      onChange={() => toggleColumn('pool', col.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                background: viewMode === 'grid' ? '#3b82f6' : '#e5e7eb',
                color: viewMode === 'grid' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '4px 0 0 4px',
                cursor: 'pointer',
              }}
            >
              📊 Tableau
            </button>
            <button
              onClick={() => setViewMode('matches')}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                background: viewMode === 'matches' ? '#3b82f6' : '#e5e7eb',
                color: viewMode === 'matches' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0 4px 4px 0',
                cursor: 'pointer',
              }}
            >
              ⚔️ Matches
            </button>
          </div>
        </div>
      </div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        {viewMode === 'grid' ? (
          <>
            {renderGridView()}
            {renderNextMatch()}
          </>
        ) : (
          renderMatchListView()
        )}
        {renderScoreModal()}
      </div>
    </div>
  );
};

const PoolView = React.memo(PoolViewComponent);
export default PoolView;
