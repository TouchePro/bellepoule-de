/**
 * BellePoule Modern - Pool View Component
 * With classic grid view and match list view
 * Licensed under GPL-3.0
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useModalResize } from '../hooks/useModalResize';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Pool, Fencer, MatchStatus, Score, Weapon, FencerStatus, Referee } from '../../shared/types';
import { Arena } from '../../shared/types/remote';
import { logger, LogCategory } from '@shared/services/logger';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
// pdfExport (jsPDF) chargé à la demande pour alléger le bundle initial
import { useColumnVisibility, POOL_COLUMNS, ColumnId } from '../hooks/useColumnVisibility';
import { usePdfTemplateStore } from '../../features/pdfTemplates/hooks/usePdfTemplateStore';
import { useHistory } from '../hooks/useHistory';
import PoolScoreMatrix from './pool/PoolScoreMatrix';
import PoolMatchList from './pool/PoolMatchList';
import Confetti from './Confetti';
import AddFencerToPoolModal from './AddFencerToPoolModal';
import { MatchAuditLog } from './MatchAuditLog';
import {
  TOOLBAR_BTN,
  ICON_BTN,
  SPECIAL_BTN,
  ROW_BETWEEN,
  MATCH_LABEL,
  MATCH_CENTER,
  COL_GAP,
  REF_EMPTY,
  REF_BTN,
  FENCER_NAME,
  NEXT_MATCH_BOX,
} from './poolView.styles';

interface PoolViewProps {
  pool: Pool;
  maxScore?: number;
  weapon?: Weapon;
  competitionName?: string;
  competitionId?: string;
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
  onFencerAdded?: (updatedPool: Pool) => void;
  arenaCount?: number;
  arenas?: Arena[];
  isRemoteActive?: boolean;
  remoteServerUrl?: string;
  onMatchArenaChange?: (
    matchId: string,
    oldArena: number,
    newArena: number | null,
    fencerA?: Fencer | null,
    fencerB?: Fencer | null
  ) => void;
}

type ViewMode = 'grid' | 'matches';

const PoolViewComponent: React.FC<PoolViewProps> = ({
  pool,
  maxScore = 5,
  weapon,
  competitionName,
  competitionId,
  onScoreUpdate,
  onMatchReset,
  onMatchCancel,
  onFencerChangePool,
  onFencerStatusChange,
  onFencerAdded,
  arenaCount,
  arenas,
  isRemoteActive,
  remoteServerUrl,
  onMatchArenaChange,
}) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { isColumnVisible, toggleColumn, getVisibleColumns } = useColumnVisibility();
  const poolTemplate = usePdfTemplateStore(s => s.templates.pool);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [isMatchInverted, setIsMatchInverted] = useState(false);
  // Statut spécial en attente de désignation du combattant (abandon/forfait/exclusion)
  const [pendingSpecialStatus, setPendingSpecialStatus] = useState<
    'abandon' | 'forfait' | 'exclusion' | null
  >(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [editScoreA, setEditScoreA] = useState('');
  const [editScoreB, setEditScoreB] = useState('');
  const [victoryA, setVictoryA] = useState(false);
  const [victoryB, setVictoryB] = useState(false);
  const [matchesUpdateTrigger, setMatchesUpdateTrigger] = useState(0);
  const [keyboardFocusField, setKeyboardFocusField] = useState<'A' | 'B'>('A');
  const [signedFencerIds, setSignedFencerIds] = useState<string[]>([]);
  const [matchArenaOverrides, setMatchArenaOverrides] = useState<Map<string, number>>(new Map());
  const [showRefereeModal, setShowRefereeModal] = useState(false);
  const [competitionReferees, setCompetitionReferees] = useState<Referee[]>([]);
  const [isLoadingReferees, setIsLoadingReferees] = useState(false);
  const [assignedReferee, setAssignedReferee] = useState<Referee | null>(pool.referees?.[0] ?? null);

  const defaultArena = (pool.strip != null && pool.strip > 0 ? pool.strip : pool.number) ?? 1;

  const handleMatchArenaChange = useCallback((
    matchId: string,
    oldArena: number,
    newArena: number | null,
    fencerA?: Fencer | null,
    fencerB?: Fencer | null
  ) => {
    setMatchArenaOverrides(prev => {
      const next = new Map(prev);
      if (newArena === null) {
        next.delete(matchId);
      } else {
        next.set(matchId, newArena);
      }
      return next;
    });
    onMatchArenaChange?.(matchId, oldArena, newArena, fencerA, fencerB);
  }, [onMatchArenaChange]);


  const openRefereeModal = useCallback(() => {
    setShowRefereeModal(true);
    if (competitionId) {
      setIsLoadingReferees(true);
      window.electronAPI.db.getRefereesByCompetition(competitionId)
        .then(refs => setCompetitionReferees(refs))
        .finally(() => setIsLoadingReferees(false));
    }
  }, [competitionId]);

  const closeRefereeModal = useCallback(() => setShowRefereeModal(false), []);
  const refereeModalRef = useFocusTrap<HTMLDivElement>(showRefereeModal, closeRefereeModal);

  const handleAssignReferee = useCallback((referee: Referee | null) => {
    window.electronAPI.db.updatePoolReferee(pool.id, referee?.id ?? null);
    setAssignedReferee(referee);
    setShowRefereeModal(false);
  }, [pool.id]);

  const { addAction, undo, redo, canUndo, canRedo } = useHistory();
  const [showPoolConfetti, setShowPoolConfetti] = useState(false);
  const [showAddFencerModal, setShowAddFencerModal] = useState(false);
  const [auditMatchId, setAuditMatchId] = useState<string | null>(null);
  const [showFinishedLog, setShowFinishedLog] = useState(false);
  const prevIsComplete = useRef(pool.isComplete);

  useEffect(() => {
    if (pool.isComplete && !prevIsComplete.current) {
      setShowPoolConfetti(true);
      setTimeout(() => setShowPoolConfetti(false), 3000);
    }
    prevIsComplete.current = pool.isComplete;
  }, [pool.isComplete]);

  const isLaserSabre = weapon === Weapon.LASER;
  const isLocked = pool.fencers.length > 0 && signedFencerIds.filter(id => pool.fencers.some(f => f.id === id)).length >= pool.fencers.length;
  const fencers = pool.fencers;

  const isVisible = useCallback(
    (columnId: ColumnId): boolean => {
      if (columnId === 'quest' && !isLaserSabre) return false;
      return isColumnVisible('pool', columnId, pool.id);
    },
    [isLaserSabre, isColumnVisible, pool.id]
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

  // Charger les signatures au montage et écouter les mises à jour en temps réel
  useEffect(() => {
    window.electronAPI.db.getPoolSignatures(pool.id).then(sigs => {
      setSignedFencerIds(sigs.map(s => s.fencerId));
    });
    const unsub = window.electronAPI.onPoolSignatureUpdated(data => {
      if (data.poolId === pool.id) {
        setSignedFencerIds(data.signedFencerIds);
      }
    });
    return unsub;
  }, [pool.id]);

  // Raccourcis clavier

  // Clé de statut stable : recalculée seulement quand un statut change réellement
  const matchesStatusKey = useMemo(
    () => pool.matches.map(m => m.status).join(','),
    [pool.matches]
  );

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
  }, [pool.matches, matchesStatusKey]);
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
          if (!isLocked) {
            const firstPending = orderedMatches.pending[0];
            if (firstPending) {
              openScoreModal(firstPending.index);
              setKeyboardFocusField('A');
            }
          }
          return;
        }
        if (e.key === 'z' && e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          if (!isLocked) undo();
          return;
        }
        if (
          (e.key === 'y' && e.ctrlKey) ||
          (e.key === 'z' && e.ctrlKey && e.shiftKey) ||
          (e.key === 'Z' && e.ctrlKey && e.shiftKey)
        ) {
          e.preventDefault();
          if (!isLocked) redo();
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
    if (isLocked) return;
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

  // Ouvre la modale « Quel est le combattant … ? ». Les erreurs arrivent : on
  // ne déclenche rien tant que le référent n'a pas désigné un combattant.
  const handleSpecialStatus = (status: 'abandon' | 'forfait' | 'exclusion') => {
    if (editingMatch === null) return;
    setPendingSpecialStatus(status);
  };

  // Le référent a désigné le combattant concerné (côté affiché) dans la modale
  const applySpecialStatus = (side: 'left' | 'right') => {
    const status = pendingSpecialStatus;
    if (status === null || editingMatch === null) {
      setPendingSpecialStatus(null);
      return;
    }

    const match = pool.matches[editingMatch];
    // Respecter l'ordre d'affichage : le tireur affiché à gauche est "fencerLeft"
    const fencerLeft = isMatchInverted ? match.fencerB : match.fencerA;
    const fencerRight = isMatchInverted ? match.fencerA : match.fencerB;

    if (side === 'left') {
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

    // Fermer les modales immédiatement après la mise à jour
    setPendingSpecialStatus(null);
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
      const sigsArray = await window.electronAPI.db.getPoolSignatures(pool.id);
      const signatures = Object.fromEntries(sigsArray.map(s => [s.fencerId, s.signatureData]));
      const { exportPoolToPDF } = await import('../../shared/utils/pdfExport');
      await exportPoolToPDF(
        pool,
        {
          title: `Poule ${pool.number} - ${pool.fencers.length} tireurs`,
          includeFinishedMatches: true,
          includePendingMatches: true,
          includePoolStats: true,
          logoBase64: logo,
          competitionName,
          visibleColumns: getVisibleColumns('pool', pool.id),
          signatures,
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
                style={SPECIAL_BTN}
              >
                🚴 Abandon
              </button>
              <button
                className="btn btn-warning"
                onClick={() => handleSpecialStatus('forfait')}
                style={SPECIAL_BTN}
              >
                📋 Forfait
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleSpecialStatus('exclusion')}
                style={SPECIAL_BTN}
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
                  style={SPECIAL_BTN}
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

  // Modale de désignation du combattant pour abandon / forfait / exclusion.
  // Un bouton par combattant + un bouton Annuler (les erreurs, ça arrive).
  const renderSpecialStatusModal = () => {
    if (pendingSpecialStatus === null || editingMatch === null) return null;

    const match = pool.matches[editingMatch];
    const fencerLeft = isMatchInverted ? match.fencerB : match.fencerA;
    const fencerRight = isMatchInverted ? match.fencerA : match.fencerB;

    const statusLabel =
      pendingSpecialStatus === 'abandon'
        ? 'abandonné'
        : pendingSpecialStatus === 'forfait'
          ? 'forfait'
          : 'exclu';
    const statusHint =
      pendingSpecialStatus === 'abandon'
        ? 'Il perd ce match ; son adversaire est déclaré vainqueur.'
        : pendingSpecialStatus === 'forfait'
          ? 'Il perd ce match ; son adversaire est déclaré vainqueur.'
          : 'Il est exclu ; son adversaire est déclaré vainqueur de ce match.';

    const fencerName = (f?: typeof fencerLeft) =>
      f ? `${f.lastName} ${f.firstName ?? ''}`.trim() : '—';

    return (
      <div
        className="modal-overlay"
        onClick={() => setPendingSpecialStatus(null)}
        style={{ zIndex: 11000 }}
      >
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
          <div className="modal-header">
            <h2 className="modal-title">Quel est le combattant {statusLabel} ?</h2>
          </div>
          <div className="modal-body">
            <p style={{ marginTop: 0, color: '#6b7280', fontSize: '0.875rem' }}>{statusHint}</p>
            <div style={COL_GAP}>
              <button
                type="button"
                className="btn btn-warning"
                onClick={() => applySpecialStatus('left')}
                style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
              >
                {fencerName(fencerLeft)}
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={() => applySpecialStatus('right')}
                style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
              >
                {fencerName(fencerRight)}
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPendingSpecialStatus(null)}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Grid View
  const renderGridView = () => (
    <>
      <PoolScoreMatrix
        pool={pool}
        isLaserSabre={isLaserSabre}
        isVisible={isVisible}
        toggleColumn={(context, columnId) => toggleColumn(context, columnId, pool.id)}
        onCellClick={handleCellClick}
        onFencerChangePool={onFencerChangePool}
        isLocked={isLocked}
        onMatchReset={!isLocked && onMatchReset ? (rowFencer, colFencer) => {
          const matchIndex = getMatchIndex(rowFencer, colFencer);
          if (matchIndex !== -1) onMatchReset(matchIndex);
        } : undefined}
      />
      {orderedMatches.finished.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={() => setShowFinishedLog((v) => !v)}
            aria-expanded={showFinishedLog}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              color: '#6b7280',
              fontWeight: 600,
              marginBottom: '0.25rem',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <span style={{ transition: 'transform 0.15s', transform: showFinishedLog ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            Journal des matchs terminés ({orderedMatches.finished.length})
          </button>
          {showFinishedLog && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {orderedMatches.finished.map(({ match, index }) => (
              <button
                key={index}
                onClick={() => setAuditMatchId(match.id)}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#7c3aed',
                }}
                title="Voir le journal du match"
              >
                📋 {match.fencerA?.lastName} vs {match.fencerB?.lastName}
              </button>
            ))}
          </div>
          )}
        </div>
      )}
    </>
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
        <div style={{ ...NEXT_MATCH_BOX, background: '#6b7280', opacity: 0.7 }}>
          <div style={ROW_BETWEEN}>
            <div style={MATCH_LABEL}>
              ✕ Match non disputé
            </div>
            <div style={MATCH_CENTER}>
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
      <div style={{ ...NEXT_MATCH_BOX, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
        <div style={ROW_BETWEEN}>
          <div style={MATCH_LABEL}>
            ⚔️ Prochain match
          </div>
          <div style={MATCH_CENTER}>
            <span style={FENCER_NAME}>
              {nextMatch.match.fencerA?.lastName} {nextMatch.match.fencerA?.firstName?.charAt(0)}.
              {nextMatch.match.fencerA?.ranking && ` #${nextMatch.match.fencerA.ranking}`}
            </span>
            <span style={{ opacity: 0.7 }}>vs</span>
            <span style={FENCER_NAME}>
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


  return (
    <>
    <div className="card">
      <Confetti active={showPoolConfetti} particleCount={100} origin={{ x: 0.5, y: 0.5 }} />
      {isLocked && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          padding: '0.5rem 1rem',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#991b1b',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}>
          🔒 Feuille signée par tous les combattants — scores verrouillés
        </div>
      )}
      <div
        className="card-header"
        style={ROW_BETWEEN}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>Poule {pool.number}</span>
          <span className={`badge ${pool.isComplete ? 'badge-success' : 'badge-warning'}`}>
            {pool.isComplete ? 'Terminée' : `${finishedCount}/${totalMatches}`}
          </span>
          {(() => {
            const total = pool.fencers.length;
            const signed = signedFencerIds.filter(id => pool.fencers.some(f => f.id === id)).length;
            const allSigned = signed === total && total > 0;
            const noneSigned = signed === 0;
            return (
              <span
                title={allSigned ? 'Tous les combattants ont signé — PDF disponible' : `${signed}/${total} signature(s)`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: allSigned ? '#d1fae5' : noneSigned ? '#f3f4f6' : '#fef3c7',
                  color: allSigned ? '#065f46' : noneSigned ? '#6b7280' : '#92400e',
                  border: `1px solid ${allSigned ? '#6ee7b7' : noneSigned ? '#e5e7eb' : '#fcd34d'}`,
                }}
              >
                ✍️ {signed}/{total}
              </span>
            );
          })()}
          <button
            onClick={openRefereeModal}
            title={assignedReferee ? `Arbitre : ${assignedReferee.lastName} ${assignedReferee.firstName}` : 'Assigner un arbitre'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: assignedReferee ? '#dbeafe' : '#f3f4f6',
              color: assignedReferee ? '#1d4ed8' : '#6b7280',
              border: `1px solid ${assignedReferee ? '#93c5fd' : '#e5e7eb'}`,
            }}
          >
            🧑‍⚖️ {assignedReferee ? `${assignedReferee.lastName}` : '+Arbitre'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              ...ICON_BTN,
              background: canUndo ? '#6b7280' : '#e5e7eb',
              color: canUndo ? 'white' : '#9ca3af',
              cursor: canUndo ? 'pointer' : 'not-allowed',
            }}
            title="Annuler (Ctrl+Z)"
            aria-label="Annuler la dernière action"
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              ...ICON_BTN,
              background: canRedo ? '#6b7280' : '#e5e7eb',
              color: canRedo ? 'white' : '#9ca3af',
              cursor: canRedo ? 'pointer' : 'not-allowed',
            }}
            title="Rétablir (Ctrl+Y)"
            aria-label="Rétablir l'action annulée"
          >
            ↪
          </button>
          <button
            onClick={handleAutoFillScores}
            style={{ ...TOOLBAR_BTN, background: '#f59e0b', color: 'white' }}
            title="Remplir automatiquement les scores (test)"
          >
            🎲 Auto
          </button>
          <button
            onClick={handleExportPDF}
            style={{ ...TOOLBAR_BTN, background: '#10b981', color: 'white' }}
            title="Exporter la pôle en PDF"
          >
            📄 PDF
          </button>
          {pool.isComplete && isRemoteActive && remoteServerUrl && (
            <button
              onClick={() => {
                const url = `${remoteServerUrl}/arene${defaultArena}/poule`;
                if (window.electronAPI?.openExternal) {
                  window.electronAPI.openExternal(url);
                } else {
                  window.open(url, '_blank');
                }
              }}
              style={{ ...TOOLBAR_BTN, background: '#6366f1', color: 'white' }}
              title={`Page signatures — arène ${defaultArena}`}
            >
              ✍️ Signature
            </button>
          )}
          {competitionId && (
            <button
              onClick={() => setShowAddFencerModal(true)}
              style={{ ...TOOLBAR_BTN, background: '#e5e7eb', color: '#374151' }}
              title="Ajouter un tireur à cette poule"
            >
              ➕ Tireur
            </button>
          )}
          <div style={{ position: 'relative' }} ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              style={{
                ...TOOLBAR_BTN,
                background: showColumnMenu ? '#6b7280' : '#e5e7eb',
                color: showColumnMenu ? 'white' : '#374151',
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
                      onChange={() => toggleColumn('pool', col.id, pool.id)}
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
                ...TOOLBAR_BTN,
                background: viewMode === 'grid' ? '#3b82f6' : '#e5e7eb',
                color: viewMode === 'grid' ? 'white' : '#374151',
                borderRadius: '4px 0 0 4px',
              }}
            >
              📊 Tableau
            </button>
            <button
              onClick={() => setViewMode('matches')}
              style={{
                ...TOOLBAR_BTN,
                background: viewMode === 'matches' ? '#3b82f6' : '#e5e7eb',
                color: viewMode === 'matches' ? 'white' : '#374151',
                borderRadius: '0 4px 4px 0',
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
          <PoolMatchList
            orderedMatches={orderedMatches}
            isLaserSabre={isLaserSabre}
            isLocked={isLocked}
            openScoreModal={openScoreModal}
            onMatchReset={onMatchReset}
            onShowMatchAudit={setAuditMatchId}
            defaultArena={defaultArena}
            arenaCount={arenaCount}
            arenas={arenas}
            isRemoteActive={isRemoteActive}
            matchArenaOverrides={matchArenaOverrides}
            onMatchArenaChange={handleMatchArenaChange}
          />
)}
        {renderScoreModal()}
        {renderSpecialStatusModal()}
      </div>
    </div>
    {showAddFencerModal && competitionId && (
      <AddFencerToPoolModal
        pool={pool}
        competitionId={competitionId}
        maxScore={maxScore}
        onConfirm={updatedPool => {
          setShowAddFencerModal(false);
          onFencerAdded?.(updatedPool);
        }}
        onClose={() => setShowAddFencerModal(false)}
      />
    )}
    {auditMatchId && (
      <React.Suspense fallback={null}>
        <MatchAuditLog matchId={auditMatchId} onClose={() => setAuditMatchId(null)} />
      </React.Suspense>
    )}
    {showRefereeModal && (
      <div className="modal-overlay" onClick={() => setShowRefereeModal(false)}>
        <div
          ref={refereeModalRef}
          className="modal"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '400px' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="referee-modal-title"
        >
          <div className="modal-header">
            <h3 className="modal-title" id="referee-modal-title">Assigner un arbitre</h3>
            <button className="btn-close" onClick={() => setShowRefereeModal(false)}>&times;</button>
          </div>
          <div className="modal-body" style={{ padding: '1.5rem' }}>
            <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
              Sélectionnez l'arbitre pour la poule {pool.number} :
            </p>
            <div style={COL_GAP}>
              <button
                className={`btn ${!assignedReferee ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleAssignReferee(null)}
                style={REF_BTN}
              >
                ✕ Aucun arbitre
              </button>
              {isLoadingReferees && (
                <p style={REF_EMPTY}>
                  Chargement des arbitres…
                </p>
              )}
              {!isLoadingReferees && competitionReferees.length === 0 && (
                <p style={REF_EMPTY}>
                  Aucun arbitre enregistré pour cette compétition
                </p>
              )}
              {!isLoadingReferees && competitionReferees.map(ref => (
                <button
                  key={ref.id}
                  className={`btn ${assignedReferee?.id === ref.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleAssignReferee(ref)}
                  style={{ ...REF_BTN, textAlign: 'left' }}
                >
                  🧑‍⚖️ {ref.lastName} {ref.firstName}
                  {ref.club && <span style={{ marginLeft: '0.5rem', opacity: 0.6, fontSize: '0.8rem' }}>({ref.club})</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

const PoolView = React.memo(PoolViewComponent);
export default PoolView;
