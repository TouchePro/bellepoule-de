/**
 * BellePoule Modern - Tableau View Component
 * Direct Elimination Table
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Fencer, FencerStatus, PoolRanking } from '../../shared/types';
export { TableauMatch, FinalResult, ConsolationBracket, propagateWinners } from './tableau/tableauTypes';
import { TableauMatch, FinalResult, ConsolationBracket, propagateWinners } from './tableau/tableauTypes';
import { useToast } from './Toast';
import { useModalResize } from '../hooks/useModalResize';
import Bracket from './Bracket';
import { exportTableauToPDF, printTableauHTML, MAX_MATCHES_PER_PAGE_TABLEAU, exportBracketTreeToPDF } from '../../shared/utils/pdfExport';
import { usePdfTemplateStore } from '../../features/pdfTemplates/hooks/usePdfTemplateStore';
import MatchCard from './tableau/MatchCard';
import SeedingTable from './tableau/SeedingTable';
import TableauScoreModal from './tableau/TableauScoreModal';
import TableauPendingSection from './tableau/TableauPendingSection';
import TableauToolbar from './tableau/TableauToolbar';

interface BracketMatch {
  id: string;
  round: number;
  position: number;
  fencerA: Fencer | null;
  fencerB: Fencer | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId?: string;
  isBye?: boolean;
}


interface TableauViewProps {
  ranking: PoolRanking[];
  matches: TableauMatch[];
  onMatchesChange: (matches: TableauMatch[]) => void;
  maxScore?: number;
  onComplete?: (results: FinalResult[]) => void;
  thirdPlaceMatch?: boolean;
  playAllPositions?: boolean;
  arenaCount?: number;
  onMatchArenaChange?: (matchId: string, oldArena: number | null, newArena: number | null, fencerA?: any, fencerB?: any) => void;
  consolationBrackets?: ConsolationBracket[];
  onConsolationBracketsChange?: (brackets: ConsolationBracket[]) => void;
}

// ─── Static style constants ───────────────────────────────────────────────────

const TV_STYLES = {
  root: { padding: '1rem' } satisfies React.CSSProperties,
  scrollArea: { padding: '1rem', background: '#f9fafb', borderRadius: '8px', maxHeight: '70vh', overflowY: 'auto' as const } satisfies React.CSSProperties,
  pendingOrderRow: { marginBottom: '0.75rem', display: 'flex', justifyContent: 'flex-end' as const } satisfies React.CSSProperties,
  pendingOrderBtn: { background: '#e5e7eb', border: 'none', padding: '0.375rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.25rem' } satisfies React.CSSProperties,
  summaryBox: { marginTop: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '8px' } satisfies React.CSSProperties,
  summaryTitle: { fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' } satisfies React.CSSProperties,
  summaryFlex: { display: 'flex', flexWrap: 'wrap' as const, gap: '0.5rem' } satisfies React.CSSProperties,
  summaryItemBase: { padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #e5e7eb' } satisfies React.CSSProperties,
  pendingEmpty: { padding: '2rem', textAlign: 'center' as const, color: '#6b7280' } satisfies React.CSSProperties,
  roundCol: { display: 'flex', flexDirection: 'column' as const, justifyContent: 'flex-start', minWidth: '200px' } satisfies React.CSSProperties,
  roundHeader: { textAlign: 'center' as const, fontWeight: '600', marginBottom: '0.5rem', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', userSelect: 'none' as const } satisfies React.CSSProperties,
  roundHeaderChevron: { fontSize: '1rem', fontWeight: 'bold', marginRight: '0.25rem' } satisfies React.CSSProperties,
  fullRoundsRow: { display: 'flex', gap: '1rem', overflowX: 'auto' as const } satisfies React.CSSProperties,
  barragesBox: { marginBottom: '1rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' } satisfies React.CSSProperties,
  barragesTitle: { fontWeight: 600, marginBottom: '0.5rem', color: '#1e40af' } satisfies React.CSSProperties,
  barragesFlex: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const } satisfies React.CSSProperties,
  consolationSection: { marginTop: '1.5rem' } satisfies React.CSSProperties,
  consolationCard: { background: '#f9fafb', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', border: '1px solid #e5e7eb' } satisfies React.CSSProperties,
  consolationHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' } satisfies React.CSSProperties,
  consolationTitle: { margin: 0, fontSize: '1rem', fontWeight: 600, color: '#374151' } satisfies React.CSSProperties,
  consolationDoneBadge: { background: '#d1fae5', color: '#065f46', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 } satisfies React.CSSProperties,
  consolationWinnerBadge: { background: '#fef3c7', padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600 } satisfies React.CSSProperties,
  consolationRoundsRow: { display: 'flex', gap: '1rem', overflowX: 'auto' as const } satisfies React.CSSProperties,
  consolationRoundCol: { display: 'flex', flexDirection: 'column' as const, minWidth: '200px' } satisfies React.CSSProperties,
  consolationRoundTitle: { textAlign: 'center' as const, fontWeight: 600, marginBottom: '0.5rem', color: '#374151', fontSize: '0.875rem' } satisfies React.CSSProperties,
  consolationRoundMatches: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' } satisfies React.CSSProperties,
  pdfModalBody: { padding: '1.5rem' } satisfies React.CSSProperties,
  pdfModalHint: { marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' } satisfies React.CSSProperties,
  pdfModalLabel: { display: 'block', fontWeight: '600', marginBottom: '0.5rem' } satisfies React.CSSProperties,
  pdfModalMaxHint: { fontWeight: '400', color: '#6b7280' } satisfies React.CSSProperties,
  pdfModalBtnRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' } satisfies React.CSSProperties,
  pdfModalCountHint: { marginTop: '0.75rem', fontSize: '0.8rem', color: '#9ca3af' } satisfies React.CSSProperties,
  pdfModalFooter: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' as const } satisfies React.CSSProperties,
  arenaModalBody: { padding: '1.5rem' } satisfies React.CSSProperties,
  arenaModalHint: { marginBottom: '1rem', color: '#6b7280' } satisfies React.CSSProperties,
  arenaModalGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' } satisfies React.CSSProperties,
  arenaModalNoArenaBtn: { padding: '0.75rem' } satisfies React.CSSProperties,
  arenaQueueHint: { fontSize: '0.7rem', marginLeft: '0.3rem', color: '#6b7280' } satisfies React.CSSProperties,
} satisfies Record<string, React.CSSProperties>;

const BASE_MATCH_HEIGHT = 100;
const SLOT_HEIGHT = BASE_MATCH_HEIGHT + 50; // hauteur d'un créneau dans la première colonne


const TableauViewComponent: React.FC<TableauViewProps> = ({
  ranking,
  matches,
  onMatchesChange,
  maxScore = 15,
  onComplete,
  thirdPlaceMatch = false,
  playAllPositions = false,
  arenaCount = 4,
  onMatchArenaChange,
  consolationBrackets: consolationBracketsprop = [],
  onConsolationBracketsChange,
}) => {
  const { showToast } = useToast();
  const tableauTemplate = usePdfTemplateStore(s => s.templates.tableau);
  const [tableauSize, setTableauSize] = useState<number>(0);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editingConsolationId, setEditingConsolationId] = useState<string | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [editScoreA, setEditScoreA] = useState<string>('');
  const [editScoreB, setEditScoreB] = useState<string>('');
  const [victoryA, setVictoryA] = useState(false);
  const [victoryB, setVictoryB] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'pending'>('full');
  const [pendingOrder, setPendingOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [showArenaModal, setShowArenaModal] = useState(false);
  const [selectedMatchForArena, setSelectedMatchForArena] = useState<string | null>(null);
  const [selectedMatchConsolationBracketId, setSelectedMatchConsolationBracketId] = useState<string | null>(null);
  const [pyramidViewMode, setPyramidViewMode] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfMode, setPdfMode] = useState<'print' | 'pdf'>('pdf');
  const [pdfMatchesPerPage, setPdfMatchesPerPage] = useState<number>(MAX_MATCHES_PER_PAGE_TABLEAU);
  const [selectedRounds, setSelectedRounds] = useState<Set<number>>(new Set());
  const [autoAssignArenas, setAutoAssignArenas] = useState(true);
  const isUnlimitedScore = maxScore === 999;
  const prevMatchesLengthRef = useRef(0);
  const mountMatchesRef = useRef(matches);
  const consolationBrackets = consolationBracketsprop;
  const setConsolationBrackets = (updater: ConsolationBracket[] | ((prev: ConsolationBracket[]) => ConsolationBracket[])) => {
    const next = typeof updater === 'function' ? updater(consolationBrackets) : updater;
    onConsolationBracketsChange?.(next);
  };

  const { modalRef } = useModalResize({
    defaultWidth: 600,
    defaultHeight: 400,
    minWidth: 400,
    minHeight: 300,
  });

  const distributeArenasRoundRobin = useCallback(
    (matchList: TableauMatch[]): TableauMatch[] => {
      if (arenaCount <= 0) return matchList;
      let arenaIdx = 0;
      return matchList.map(m => {
        if (m.fencerA && m.fencerB && !m.isBye && !m.winner) {
          const arena = (arenaIdx % arenaCount) + 1;
          arenaIdx++;
          return { ...m, arena };
        }
        return m;
      });
    },
    [arenaCount]
  );

  // Auto-assign arenas when matches are (re)generated and autoAssignArenas is on
  useEffect(() => {
    const playable = matches.filter(m => m.fencerA && m.fencerB && !m.isBye);
    const prev = prevMatchesLengthRef.current;
    prevMatchesLengthRef.current = playable.length;
    if (!autoAssignArenas || arenaCount <= 0 || playable.length === 0) return;
    // Only auto-assign on initial generation (prev was 0) to avoid overriding manual changes.
    // Skip if a champion already exists: returning from results view would otherwise trigger
    // onMatchesChange → matches ref changes → safety-net effect fires → onComplete called
    // → forced redirect back to results.
    if (prev === 0 && playable.length > 0) {
      const champion = matches.find(m => m.round === 2)?.winner;
      if (!champion) {
        const updated = distributeArenasRoundRobin(matches);
        onMatchesChange(updated);
        updated.forEach(m => {
          const orig = matches.find(o => o.id === m.id);
          if (orig && orig.arena !== m.arena) {
            onMatchArenaChange?.(m.id, orig.arena ?? null, m.arena ?? null);
          }
        });
      }
    }
  }, [matches.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAutoAssignToggle = useCallback(
    (enabled: boolean) => {
      setAutoAssignArenas(enabled);
      if (enabled && arenaCount > 0) {
        const updated = distributeArenasRoundRobin(matches);
        onMatchesChange(updated);
        updated.forEach(m => {
          const orig = matches.find(o => o.id === m.id);
          if (orig && orig.arena !== m.arena) {
            onMatchArenaChange?.(m.id, orig.arena ?? null, m.arena ?? null);
          }
        });
      }
    },
    [arenaCount, distributeArenasRoundRobin, matches, onMatchesChange, onMatchArenaChange]
  );

  useEffect(() => {
    const eligibleCount = ranking.filter(
      r =>
        r.fencer.status !== FencerStatus.ABANDONED &&
        r.fencer.status !== FencerStatus.FORFAIT &&
        r.fencer.status !== FencerStatus.EXCLUDED
    ).length;
    if (eligibleCount > 0) {
      const expectedSize = getMainTableauSize(eligibleCount);
      const currentSize = matches.length > 0 ? Math.max(...matches.filter(m => m.round !== 3).map(m => m.round)) : 0;

      const hasThirdPlace = matches.some(m => m.round === 3);
      const thirdPlaceMismatch = thirdPlaceMatch !== hasThirdPlace;

      if (matches.length === 0 || currentSize !== expectedSize || thirdPlaceMismatch) {
        generateTableau();
      } else {
        setTableauSize(currentSize);
      }
    }
  }, [ranking.length, thirdPlaceMatch, maxScore, matches.length]); // Dépend du nombre de tireurs, match pour la 3ème place et score max

  // Filet de sécurité : détecte la complétion du tableau à chaque mise à jour de matches
  // Couvre les chemins qui ne passent pas par handleScoreSubmit (saisie distante, statuts spéciaux)
  useEffect(() => {
    // Ignorer si matches n'a pas changé depuis le montage du composant.
    // Robuste au double-invoke de React StrictMode : le ref de montage reste stable
    // entre les deux passes, contrairement à un booléen consommé au premier run.
    if (matches === mountMatchesRef.current) return;
    if (matches.length === 0 || !onComplete) return;
    const champion = matches.find(m => m.round === 2)?.winner;
    if (!champion) return;
    const thirdPlaceEntry = matches.find(m => m.round === 3);
    const thirdPlaceDone = !thirdPlaceEntry || !!thirdPlaceEntry.winner;
    if (thirdPlaceDone && !playAllPositions) {
      onComplete(calculateFinalResults(matches));
    }
    // calculateFinalResults et onComplete sont stables pendant la phase tableau
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  // playAllPositions : déclencher onComplete quand le tableau principal ET tous les brackets de consolation sont terminés
  useEffect(() => {
    if (!playAllPositions || !onComplete || matches.length === 0) return;
    // Ignorer au montage (données déjà complètes restaurées depuis DB)
    if (matches === mountMatchesRef.current) return;
    const mainFinalDone = !!matches.find(m => m.round === 2)?.winner;
    const mainThirdEntry = matches.find(m => m.round === 3);
    const mainThirdDone = !mainThirdEntry || !!mainThirdEntry.winner;
    if (!mainFinalDone || !mainThirdDone) return;
    // Des brackets de consolation sont attendus quand tableauSize >= 8 (rounds > 4)
    // ou quand il y a des barrages. Pour tableauSize <= 4, aucun bracket de consolation
    // n'est créé (les demi-finalistes perdants vont directement à la petite finale).
    const hasBarrages = matches.some(m => m.round === tableauSize * 2);
    const needsConsolation = tableauSize >= 8 || hasBarrages;
    if (needsConsolation && consolationBrackets.length === 0) return; // pas encore créés
    if (consolationBrackets.some(b => !b.isComplete)) return;
    onComplete(buildCombinedResults(matches, consolationBrackets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, consolationBrackets, playAllPositions]);

  // Mode playAllPositions : créer les brackets de consolation quand un round du tableau principal se complète
  useEffect(() => {
    if (!playAllPositions || matches.length === 0) return;

    setConsolationBrackets(prevBrackets => {
      let updated = [...prevBrackets];
      let changed = false;

      // Vérifier les barrages : round = mainSize * 2
      const barrageRound = tableauSize * 2;
      const barrageMatches = matches.filter(m => m.round === barrageRound);
      if (barrageMatches.length > 0 && isRoundComplete(matches, barrageRound)) {
        const alreadyExists = updated.some(b => b.sourceRound === barrageRound && b.parentBracketId === 'main');
        if (!alreadyExists) {
          const losers = getRoundLosers(matches, barrageRound, ranking);
          if (losers.length > 0) {
            // bracket pour les dernières places
            const firstPlace = tableauSize + 1;
            updated.push(buildConsolationBracket(losers, firstPlace, barrageRound, 'main'));
            changed = true;
          }
        }
      }

      // Vérifier chaque round du tableau principal (≥ 4, donc QF et plus profonds)
      const mainRounds = [tableauSize, ...Array.from({ length: Math.log2(tableauSize) - 2 }, (_, i) => tableauSize / Math.pow(2, i + 1))].filter(r => r > 4);
      for (const round of mainRounds) {
        if (!isRoundComplete(matches, round)) continue;
        const alreadyExists = updated.some(b => b.sourceRound === round && b.parentBracketId === 'main');
        if (alreadyExists) continue;
        const losers = getRoundLosers(matches, round, ranking);
        if (losers.length === 0) continue;
        const fp = consolationFirstPlace(1, round);
        updated.push(buildConsolationBracket(losers, fp, round, 'main'));
        changed = true;
      }

      // Vérifier les brackets de consolation existants pour créer des sous-brackets
      for (const bracket of updated) {
        if (bracket.isComplete) continue;
        const bracketRounds = Array.from(
          { length: Math.log2(bracket.size) - 1 },
          (_, i) => bracket.size / Math.pow(2, i)
        ).filter(r => r > 4);

        for (const round of bracketRounds) {
          if (!isRoundComplete(bracket.matches, round)) continue;
          const alreadyExists = updated.some(b => b.sourceRound === round && b.parentBracketId === bracket.id);
          if (alreadyExists) continue;
          const losers = getRoundLosers(bracket.matches, round, ranking);
          if (losers.length === 0) continue;
          const fp = consolationFirstPlace(bracket.firstPlace, round);
          updated.push(buildConsolationBracket(losers, fp, round, bracket.id));
          changed = true;
        }

        // Marquer le bracket comme complet si la finale + petite finale sont terminées
        const finalMatch = bracket.matches.find(m => m.round === 2);
        const thirdMatch = bracket.matches.find(m => m.round === 3);
        const nowComplete = !!finalMatch?.winner && (!thirdMatch || !!thirdMatch.winner);
        if (nowComplete && !bracket.isComplete) {
          bracket.isComplete = true;
          changed = true;
        }
      }

      return changed ? updated : prevBrackets;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, tableauSize, playAllPositions]);

  // Gagnants des barrages → placer dans le tableau principal
  useEffect(() => {
    if (!playAllPositions || tableauSize === 0) return;
    const barrageRound = tableauSize * 2;
    const barrageMatches = matches.filter(m => m.round === barrageRound);
    if (barrageMatches.length === 0) return;

    // directCount fixe = nombre de fencers qui vont directement au tableau (sans barrage)
    const directCount = tableauSize - barrageMatches.length;

    // Pour chaque barrage terminé, placer le gagnant dans le premier tour du tableau
    let needsUpdate = false;
    const updatedMatches = matches.map(m => ({ ...m }));
    const firstRoundMatches = updatedMatches.filter(m => m.round === tableauSize).sort((a, b) => a.position - b.position);
    const seeding = generateFIESeeding(tableauSize);

    for (let i = 0; i < barrageMatches.length; i++) {
      const barrage = barrageMatches[i];
      if (!barrage.winner) continue;
      // Le gagnant du barrage i occupe le slot pour seed = directCount + i + 1
      const targetSeed = directCount + i + 1;
      const targetPos = seeding.indexOf(targetSeed); // index dans le tableau de seeding (0-based)
      if (targetPos < 0) continue;
      const matchIdx = Math.floor(targetPos / 2);
      const isA = targetPos % 2 === 0;
      const match = firstRoundMatches[matchIdx];
      if (!match) continue;
      const matchInUpdated = updatedMatches.find(m => m.id === match.id);
      if (!matchInUpdated) continue;
      const alreadyPlaced = isA
        ? matchInUpdated.fencerA?.id === barrage.winner.id
        : matchInUpdated.fencerB?.id === barrage.winner.id;
      if (!alreadyPlaced) {
        if (isA) matchInUpdated.fencerA = barrage.winner;
        else matchInUpdated.fencerB = barrage.winner;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      propagateWinners(updatedMatches, tableauSize);
      onMatchesChange(updatedMatches);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.filter(m => m.round === tableauSize * 2).map(m => m.winner?.id).join(','), tableauSize]);

  const getTableauSize = (fencerCount: number): number => {
    const sizes = [4, 8, 16, 32, 64, 128, 256];
    for (const size of sizes) {
      if (fencerCount <= size) return size;
    }
    return 256;
  };

  // Pour playAllPositions : plus grande puissance de 2 ≤ fencerCount
  const getMainTableauSize = (fencerCount: number): number => {
    if (!playAllPositions) return getTableauSize(fencerCount);
    const sizes = [4, 8, 16, 32, 64, 128, 256];
    let result = 4;
    for (const size of sizes) {
      if (size <= fencerCount) result = size;
    }
    return result;
  };

  const getEligibleFencers = (): PoolRanking[] =>
    ranking.filter(
      r =>
        r.fencer.status !== FencerStatus.ABANDONED &&
        r.fencer.status !== FencerStatus.FORFAIT &&
        r.fencer.status !== FencerStatus.EXCLUDED
    );

  const generateTableau = () => {
    const qualifiedFencers = getEligibleFencers().sort((a, b) => a.rank - b.rank);
    const mainSize = getMainTableauSize(qualifiedFencers.length);
    const barrageCount = qualifiedFencers.length - mainSize; // fencers en excès (0 si déjà puissance de 2)

    setTableauSize(mainSize);
    setConsolationBrackets([]); // réinitialiser les brackets de consolation

    const newMatches: TableauMatch[] = [];

    if (playAllPositions && barrageCount > 0) {
      // Créer les matchs de barrages pour les seeds du bas
      // Barrage i : seed (mainSize - barrageCount + i + 1) vs seed (qualifiedFencers.length - i)
      for (let i = 0; i < barrageCount; i++) {
        const seedA = mainSize - barrageCount + i + 1;
        const seedB = qualifiedFencers.length - i;
        const fencerA = qualifiedFencers[seedA - 1]?.fencer ?? null;
        const fencerB = qualifiedFencers[seedB - 1]?.fencer ?? null;
        newMatches.push({
          id: `barrage-${i}`,
          round: mainSize * 2, // valeur spéciale > premier tour du tableau
          position: i,
          fencerA,
          fencerB,
          scoreA: null,
          scoreB: null,
          winner: null,
          isBye: false,
        });
      }
    }

    // Premier tour du tableau principal
    // Avec barrages : les mainSize - barrageCount premiers seeds sont placés directement,
    // les barrageCount derniers slots seront remplis par les gagnants des barrages.
    const directFencers = playAllPositions && barrageCount > 0
      ? qualifiedFencers.slice(0, mainSize - barrageCount)
      : qualifiedFencers;

    const size = mainSize;
    const seeding = generateFIESeeding(size);

    for (let i = 0; i < size / 2; i++) {
      const seedA = seeding[i * 2];
      const seedB = seeding[i * 2 + 1];

      const fencerA = seedA <= directFencers.length ? directFencers[seedA - 1].fencer : null;
      const fencerB = seedB <= directFencers.length ? directFencers[seedB - 1].fencer : null;

      const isBye = !playAllPositions && (!fencerA || !fencerB);
      const winner = isBye ? fencerA || fencerB : null;

      newMatches.push({
        id: `${size}-${i}`,
        round: size,
        position: i,
        fencerA,
        fencerB,
        scoreA: null,
        scoreB: null,
        winner,
        isBye,
      });
    }

    // Générer les rounds suivants
    let currentRound = size / 2;
    while (currentRound >= 2) {
      for (let i = 0; i < currentRound / 2; i++) {
        newMatches.push({
          id: `${currentRound}-${i}`,
          round: currentRound,
          position: i,
          fencerA: null,
          fencerB: null,
          scoreA: null,
          scoreB: null,
          winner: null,
          isBye: false,
        });
      }
      currentRound = currentRound / 2;
    }

    // Ajouter le match pour la 3ème place si demandé (ou forcé en mode playAllPositions)
    if ((thirdPlaceMatch || playAllPositions) && size >= 4) {
      newMatches.push({
        id: '3-0',
        round: 3,
        position: 0,
        fencerA: null,
        fencerB: null,
        scoreA: null,
        scoreB: null,
        winner: null,
        isBye: false,
      });
    }

    // Propager les byes (seulement pour le tableau standard sans playAllPositions)
    propagateWinners(newMatches, size);
    onMatchesChange(newMatches);
  };

  const generateFIESeeding = (size: number): number[] => {
    if (size === 4) return [1, 4, 3, 2];
    if (size === 8) return [1, 8, 5, 4, 3, 6, 7, 2];
    if (size === 16) return [1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2];
    if (size === 32) {
      return [
        1, 32, 17, 16, 9, 24, 25, 8, 5, 28, 21, 12, 13, 20, 29, 4, 3, 30, 19, 14, 11, 22, 27, 6, 7,
        26, 23, 10, 15, 18, 31, 2,
      ];
    }
    if (size === 64) {
      return [
        1, 64, 33, 32, 17, 48, 49, 16, 9, 56, 41, 24, 25, 40, 57, 8, 5, 60, 37, 28, 21, 44, 53, 12,
        13, 52, 45, 20, 29, 36, 61, 4, 3, 62, 35, 30, 19, 46, 51, 14, 11, 54, 43, 22, 27, 38, 59, 6,
        7, 58, 39, 26, 23, 42, 55, 10, 15, 50, 47, 18, 31, 34, 63, 2,
      ];
    }
    if (size === 128) {
      return [
        1, 128, 65, 64, 33, 96, 97, 32, 17, 112, 81, 48, 49, 80, 113, 16, 9, 120, 73, 56, 41, 88,
        105, 24, 25, 104, 89, 40, 57, 72, 121, 8, 5, 124, 69, 60, 37, 92, 101, 28, 21, 108, 85, 44,
        53, 76, 117, 12, 13, 116, 77, 52, 45, 84, 109, 20, 29, 100, 93, 36, 61, 68, 125, 4, 3, 126,
        67, 62, 35, 94, 99, 30, 19, 110, 83, 46, 51, 78, 115, 14, 11, 118, 75, 54, 43, 86, 107, 22,
        27, 102, 91, 38, 59, 70, 123, 6, 7, 122, 71, 58, 39, 90, 103, 26, 23, 106, 87, 42, 55, 74,
        119, 10, 15, 114, 79, 50, 47, 82, 111, 18, 31, 98, 95, 34, 63, 66, 127, 2,
      ];
    }
    return Array.from({ length: size }, (_, i) => i + 1);
  };

  // Génère les matchs d'un bracket (utilisé pour les brackets de consolation)
  const generateBracketMatches = (
    fencers: PoolRanking[],
    bracketSize: number,
    withThirdPlace: boolean,
    idPrefix: string
  ): TableauMatch[] => {
    const seeding = generateFIESeeding(bracketSize);
    const newMatches: TableauMatch[] = [];

    for (let i = 0; i < bracketSize / 2; i++) {
      const seedA = seeding[i * 2];
      const seedB = seeding[i * 2 + 1];
      const fencerA = seedA <= fencers.length ? fencers[seedA - 1].fencer : null;
      const fencerB = seedB <= fencers.length ? fencers[seedB - 1].fencer : null;
      const isBye = !fencerA || !fencerB;
      const winner = isBye ? fencerA || fencerB : null;
      newMatches.push({
        id: `${idPrefix}-${bracketSize}-${i}`,
        round: bracketSize,
        position: i,
        fencerA,
        fencerB,
        scoreA: null,
        scoreB: null,
        winner,
        isBye,
      });
    }

    let currentRound = bracketSize / 2;
    while (currentRound >= 2) {
      for (let i = 0; i < currentRound / 2; i++) {
        newMatches.push({
          id: `${idPrefix}-${currentRound}-${i}`,
          round: currentRound,
          position: i,
          fencerA: null,
          fencerB: null,
          scoreA: null,
          scoreB: null,
          winner: null,
          isBye: false,
        });
      }
      currentRound = currentRound / 2;
    }

    if (withThirdPlace && bracketSize >= 4) {
      newMatches.push({
        id: `${idPrefix}-3-0`,
        round: 3,
        position: 0,
        fencerA: null,
        fencerB: null,
        scoreA: null,
        scoreB: null,
        winner: null,
        isBye: false,
      });
    }

    propagateWinners(newMatches, bracketSize);
    return newMatches;
  };

  // Crée un bracket de consolation pour les perdants donnés
  const buildConsolationBracket = (
    losers: PoolRanking[],
    firstPlace: number,
    sourceRound: number,
    parentBracketId: string
  ): ConsolationBracket => {
    const sorted = [...losers].sort((a, b) => a.rank - b.rank);
    const bracketSize = getTableauSize(sorted.length);
    const idPrefix = `cons-${firstPlace}-${Date.now()}`;
    const lastPlace = firstPlace + sorted.length - 1;
    const bracketMatches = generateBracketMatches(sorted, bracketSize, true, idPrefix);
    return {
      id: idPrefix,
      name: `Places ${firstPlace}–${lastPlace}`,
      firstPlace,
      matches: bracketMatches,
      size: bracketSize,
      isComplete: false,
      sourceRound,
      parentBracketId,
    };
  };

  // Calcule le firstPlace d'un sous-tableau de consolation pour un round donné dans un bracket parent
  // La première place d'un bracket de consolation pour les perdants du round R du bracket parent.
  // Formule : parentFirstPlace + round / 2
  // Exemple (S=16, FP=1) : round 16 → 9, round 8 → 5
  const consolationFirstPlace = (parentFirstPlace: number, round: number): number => {
    return parentFirstPlace + round / 2;
  };

  // Vérifie si un round d'un bracket est complet (tous les matchs ont un gagnant)
  const isRoundComplete = (bracketMatches: TableauMatch[], round: number): boolean => {
    const roundMatches = bracketMatches.filter(m => m.round === round);
    return roundMatches.length > 0 && roundMatches.every(m => m.winner !== null);
  };

  // Collecte les perdants d'un round dans un bracket
  const getRoundLosers = (bracketMatches: TableauMatch[], round: number, allRankings: PoolRanking[]): PoolRanking[] => {
    const roundMatches = bracketMatches.filter(m => m.round === round && m.winner);
    const losers: PoolRanking[] = [];
    for (const m of roundMatches) {
      const loser = m.fencerA?.id === m.winner?.id ? m.fencerB : m.fencerA;
      if (loser) {
        const rankEntry = allRankings.find(r => r.fencer.id === loser.id);
        if (rankEntry) losers.push(rankEntry);
      }
    }
    return losers;
  };

  const getRoundName = (round: number): string => {
    if (round === 2) return 'Finale';
    if (round === 3) return 'Petite finale';
    if (round === 4) return 'Demi-finales';
    if (round === 8) return 'Quarts de finale';
    if (round === 16) return 'Tableau de 16';
    if (round === 32) return 'Tableau de 32';
    if (round === 64) return 'Tableau de 64';
    return `Tableau de ${round}`;
  };

  const handleAutoFillScores = () => {
    const confirmed = window.confirm(
      'Remplir automatiquement tous les scores des matchs non terminés ?\n\nLes scores seront générés aléatoirement pour les tests.'
    );

    if (!confirmed) return;

    const effectiveMax = isUnlimitedScore ? 15 : maxScore;
    // Copier les matchs actuels
    const updatedMatches = [...matches];
    let filledCount = 0;

    // Traiter les matchs par ordre décroissant de round (du premier tour vers la finale)
    // Exclure la petite finale (round 3) car elle dépend des résultats des demi-finales
    const rounds = [...new Set(matches.map(m => m.round))]
      .filter(r => r !== 3)
      .sort((a, b) => b - a);

    for (const round of rounds) {
      const roundMatches = updatedMatches.filter(m => m.round === round && !m.winner && !m.isBye);

      for (const match of roundMatches) {
        // Générer des scores aléatoires
        let scoreA = Math.floor(Math.random() * (effectiveMax + 1));
        let scoreB = Math.floor(Math.random() * (effectiveMax + 1));

        // Éviter les égalités en élimination directe sans dépasser effectiveMax
        if (scoreA === scoreB) {
          if (Math.random() > 0.5) {
            if (scoreA < effectiveMax) scoreA += 1;
            else scoreB -= 1;
          } else {
            if (scoreB < effectiveMax) scoreB += 1;
            else scoreA -= 1;
          }
        }

        // Déterminer le vainqueur
        const winner = scoreA > scoreB ? match.fencerA : match.fencerB;

        // Mettre à jour le match
        const matchIndex = updatedMatches.findIndex(m => m.id === match.id);
        if (matchIndex !== -1) {
          updatedMatches[matchIndex] = {
            ...match,
            scoreA,
            scoreB,
            winner,
          };
          filledCount++;
        }
      }

      // Propager les vainqueurs au tour suivant
      propagateWinners(updatedMatches, tableauSize);
    }

    // Traiter la petite finale en dernier (elle dépend des perdants des demi-finales)
    const thirdPlaceMatch = updatedMatches.find(m => m.round === 3);
    if (
      thirdPlaceMatch &&
      thirdPlaceMatch.fencerA &&
      thirdPlaceMatch.fencerB &&
      !thirdPlaceMatch.winner
    ) {
      let scoreA = Math.floor(Math.random() * (effectiveMax + 1));
      let scoreB = Math.floor(Math.random() * (effectiveMax + 1));

      if (scoreA === scoreB) {
        if (Math.random() > 0.5) {
          if (scoreA < effectiveMax) scoreA += 1;
          else scoreB -= 1;
        } else {
          if (scoreB < effectiveMax) scoreB += 1;
          else scoreA -= 1;
        }
      }

      const winner = scoreA > scoreB ? thirdPlaceMatch.fencerA : thirdPlaceMatch.fencerB;
      const matchIndex = updatedMatches.findIndex(m => m.id === thirdPlaceMatch.id);
      if (matchIndex !== -1) {
        updatedMatches[matchIndex] = {
          ...thirdPlaceMatch,
          scoreA,
          scoreB,
          winner,
        };
        filledCount++;
      }
    }

    // Créer une copie profonde pour forcer React à re-renderer
    const matchesCopy = updatedMatches.map(m => ({ ...m }));
    onMatchesChange(matchesCopy);
    showToast(`Scores générés pour ${filledCount} match(s)`, 'success');

    // Vérifier si le tableau est complet
    const champion = updatedMatches.find(m => m.round === 2)?.winner;
    const autoFillThirdPlace = updatedMatches.find(m => m.round === 3);
    const autoFillThirdDone = !autoFillThirdPlace || !!autoFillThirdPlace.winner;
    if (champion && autoFillThirdDone && onComplete) {
      const finalResults = calculateFinalResults(updatedMatches);
      onComplete(finalResults);
    }
  };

  // Met à jour les matchs d'un bracket de consolation
  const updateConsolationMatch = (consolationId: string, matchId: string, scoreA: number, scoreB: number, winner: Fencer | null) => {
    setConsolationBrackets(prev => prev.map(bracket => {
      if (bracket.id !== consolationId) return bracket;
      const updatedMatches = bracket.matches.map(m => {
        if (m.id === matchId) return { ...m, scoreA, scoreB, winner };
        return m;
      });
      propagateWinners(updatedMatches, bracket.size);
      const finalMatch = updatedMatches.find(m => m.round === 2);
      const thirdMatch = updatedMatches.find(m => m.round === 3);
      const isComplete = !!finalMatch?.winner && (!thirdMatch || !!thirdMatch.winner);
      return { ...bracket, matches: updatedMatches.map(m => ({ ...m })), isComplete };
    }));
  };

  const handleScoreSubmit = () => {
    if (!editingMatch) return;

    const scoreA = parseInt(editScoreA) || 0;
    const scoreB = parseInt(editScoreB) || 0;

    // Validation
    if (scoreA === scoreB && !victoryA && !victoryB) {
      showToast('Les scores ne peuvent pas être égaux en élimination directe', 'error');
      return;
    }

    if (!isUnlimitedScore && maxScore > 0) {
      if (scoreA > maxScore || scoreB > maxScore) {
        showToast(`Le score ne peut pas dépasser ${maxScore}`, 'error');
        return;
      }
    }

    // Si c'est un match de bracket de consolation
    if (editingConsolationId) {
      const bracket = consolationBrackets.find(b => b.id === editingConsolationId);
      if (bracket) {
        const match = bracket.matches.find(m => m.id === editingMatch);
        let winner: Fencer | null = null;
        if (victoryA) winner = match?.fencerA || null;
        else if (victoryB) winner = match?.fencerB || null;
        else if (scoreA > scoreB) winner = match?.fencerA || null;
        else if (scoreB > scoreA) winner = match?.fencerB || null;
        updateConsolationMatch(editingConsolationId, editingMatch, scoreA, scoreB, winner);
      }
      setShowScoreModal(false);
      setEditingMatch(null);
      setEditingConsolationId(null);
      setEditScoreA('');
      setEditScoreB('');
      setVictoryA(false);
      setVictoryB(false);
      return;
    }

    // Déterminer le vainqueur
    let winner: Fencer | null = null;
    if (victoryA) {
      winner = matches.find(m => m.id === editingMatch)?.fencerA || null;
    } else if (victoryB) {
      winner = matches.find(m => m.id === editingMatch)?.fencerB || null;
    } else if (scoreA > scoreB) {
      winner = matches.find(m => m.id === editingMatch)?.fencerA || null;
    } else if (scoreB > scoreA) {
      winner = matches.find(m => m.id === editingMatch)?.fencerB || null;
    }

    const updatedMatches = matches.map(match => {
      if (match.id === editingMatch) {
        return {
          ...match,
          scoreA,
          scoreB,
          winner,
        };
      }
      return match;
    });

    // Propager les gagnants avant de sauvegarder
    propagateWinners(updatedMatches, tableauSize);

    // Créer une copie profonde pour forcer React à re-renderer
    const matchesCopy = updatedMatches.map(m => ({ ...m }));
    onMatchesChange(matchesCopy);

    // Vérifier si le tableau est complet (finale + petite finale si elle existe)
    const champion = updatedMatches.find(m => m.round === 2)?.winner;
    const thirdPlaceMatch = updatedMatches.find(m => m.round === 3);
    const thirdPlaceDone = !thirdPlaceMatch || !!thirdPlaceMatch.winner;
    if (champion && thirdPlaceDone && onComplete && !playAllPositions) {
      const finalResults = calculateFinalResults(updatedMatches);
      onComplete(finalResults);
    }

    setShowScoreModal(false);
    setEditingMatch(null);
    setEditScoreA('');
    setEditScoreB('');
    setVictoryA(false);
    setVictoryB(false);
  };

  const openScoreModal = (match: TableauMatch, consolationId?: string) => {
    setEditingMatch(match.id);
    setEditingConsolationId(consolationId ?? null);
    setEditScoreA(match.scoreA?.toString() || '');
    setEditScoreB(match.scoreB?.toString() || '');
    setVictoryA(false);
    setVictoryB(false);
    setShowScoreModal(true);
  };

  const handleExportPDF = async () => {
    const perPage = Math.max(1, Math.min(pdfMatchesPerPage, MAX_MATCHES_PER_PAGE_TABLEAU));
    const filteredMatches = matches.filter(m => selectedRounds.has(m.round));
    const roundLabel = [...selectedRounds]
      .sort((a, b) => b - a)
      .map(r => getRoundName(r))
      .join(', ');
    const title = `Tableau de ${tableauSize}${roundLabel ? ` — ${roundLabel}` : ''}`;
    const logo = localStorage.getItem('bellepoule-logo') ?? undefined;
    try {
      if (pdfMode === 'print') {
        await printTableauHTML(filteredMatches, perPage, title, logo, tableauTemplate);
      } else {
        await exportTableauToPDF(filteredMatches, perPage, title, logo, tableauTemplate);
      }
      setShowPdfModal(false);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleExportTree = async () => {
    const title = `Arbre — Tableau de ${tableauSize}`;
    const logo = localStorage.getItem('bellepoule-logo') ?? undefined;
    try {
      await exportBracketTreeToPDF(matches, title, logo, tableauTemplate);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleSpecialStatus = (status: 'abandon' | 'forfait' | 'exclusion') => {
    if (!editingMatch) return;

    // Si c'est un match de consolation
    if (editingConsolationId) {
      const bracket = consolationBrackets.find(b => b.id === editingConsolationId);
      const match = bracket?.matches.find(m => m.id === editingMatch);
      if (bracket && match) {
        let winner: Fencer | null = null;
        if (status === 'exclusion') {
          winner = match.fencerA && match.fencerB ? match.fencerB : match.fencerA || match.fencerB;
        }
        updateConsolationMatch(editingConsolationId, editingMatch, match.scoreA ?? 0, match.scoreB ?? 0, winner);
      }
      setShowScoreModal(false);
      setEditingMatch(null);
      setEditingConsolationId(null);
      return;
    }

    const match = matches.find(m => m.id === editingMatch);
    if (!match) return;

    let winner: Fencer | null = null;

    if (status === 'abandon' || status === 'forfait') {
      // Le match est annulé, pas de vainqueur
      winner = null;
    } else if (status === 'exclusion') {
      // Pour l'exclusion, l'adversaire gagne
      winner = match.fencerA && match.fencerB ? match.fencerB : match.fencerA || match.fencerB;
    }

    const updatedMatches = matches.map(m => {
      if (m.id === editingMatch) {
        return {
          ...m,
          winner,
          // On pourrait ajouter des champs pour les statuts spéciaux ici
        };
      }
      return m;
    });

    // Propager les gagnants avant de sauvegarder
    propagateWinners(updatedMatches, tableauSize);
    onMatchesChange([...updatedMatches]);

    // Vérifier si le tableau est complet après statut spécial
    const specialChampion = updatedMatches.find(m => m.round === 2)?.winner;
    const specialThirdPlace = updatedMatches.find(m => m.round === 3);
    const specialThirdDone = !specialThirdPlace || !!specialThirdPlace.winner;
    if (specialChampion && specialThirdDone && onComplete) {
      onComplete(calculateFinalResults(updatedMatches));
    }

    setShowScoreModal(false);
    setEditingMatch(null);
    setEditScoreA('');
    setEditScoreB('');
    setVictoryA(false);
    setVictoryB(false);
  };

  // Helper: calculer les touches marquées par un tireur dans tous les matchs de tableau
  const getTableTouches = (fencerId: string, matchList: TableauMatch[]): number => {
    let touches = 0;
    for (const match of matchList) {
      if (match.fencerA?.id === fencerId && match.scoreA !== null) {
        touches += match.scoreA;
      } else if (match.fencerB?.id === fencerId && match.scoreB !== null) {
        touches += match.scoreB;
      }
    }
    return touches;
  };

  // Helper: récupérer les touches marquées en poules
  const getPoolTouches = (fencerId: string): number => {
    const poolRank = ranking.find(r => r.fencer.id === fencerId);
    return poolRank?.touchesScored ?? 0;
  };

  const calculateFinalResults = (matchList: TableauMatch[]): FinalResult[] => {
    // DEBUG: console.log('=== calculateFinalResults ===');
    // DEBUG: console.log('Nombre de matchs:', matchList.length);

    const results: FinalResult[] = [];
    const processed = new Set<string>();

    // Champion (gagnant de la finale)
    const finalMatch = matchList.find(m => m.round === 2);
    // DEBUG: console.log('Finale:', finalMatch?.fencerA?.lastName, 'vs', finalMatch?.fencerB?.lastName, 'winner:', finalMatch?.winner?.lastName);

    if (finalMatch?.winner) {
      const winnerPoolData = ranking.find(r => r.fencer.id === finalMatch.winner!.id);
      results.push({
        rank: 1,
        fencer: finalMatch.winner,
        eliminatedAt: 'Vainqueur',
        poolTouches: winnerPoolData?.touchesScored,
        tableTouches: getTableTouches(finalMatch.winner.id, matchList),
        totalTouches:
          (winnerPoolData?.touchesScored ?? 0) + getTableTouches(finalMatch.winner.id, matchList),
      });
      processed.add(finalMatch.winner.id);

      // 2ème (perdant de la finale)
      const loser =
        finalMatch.fencerA?.id === finalMatch.winner.id ? finalMatch.fencerB : finalMatch.fencerA;
      if (loser) {
        const loserPoolData = ranking.find(r => r.fencer.id === loser.id);
        results.push({
          rank: 2,
          fencer: loser,
          eliminatedAt: 'Finale',
          poolTouches: loserPoolData?.touchesScored,
          tableTouches: getTableTouches(loser.id, matchList),
          totalTouches: (loserPoolData?.touchesScored ?? 0) + getTableTouches(loser.id, matchList),
        });
        processed.add(loser.id);
        // DEBUG: console.log('2ème place:', loser.lastName);
      }
    }

    // Match pour la 3ème place (existe si présent)
    const thirdPlaceMatch = matchList.find(m => m.round === 3);
    // DEBUG: console.log('Petite finale:', thirdPlaceMatch?.fencerA?.lastName, 'vs', thirdPlaceMatch?.fencerB?.lastName, 'winner:', thirdPlaceMatch?.winner?.lastName);

    if (thirdPlaceMatch?.winner) {
      const winnerPoolData = ranking.find(r => r.fencer.id === thirdPlaceMatch.winner!.id);
      results.push({
        rank: 3,
        fencer: thirdPlaceMatch.winner,
        eliminatedAt: 'Petite Finale',
        poolTouches: winnerPoolData?.touchesScored,
        tableTouches: getTableTouches(thirdPlaceMatch.winner.id, matchList),
        totalTouches:
          (winnerPoolData?.touchesScored ?? 0) +
          getTableTouches(thirdPlaceMatch.winner.id, matchList),
      });
      processed.add(thirdPlaceMatch.winner.id);
      // DEBUG: console.log('3ème place:', thirdPlaceMatch.winner.lastName);

      // 4ème place (perdant du match pour la 3ème place)
      const fourthPlace =
        thirdPlaceMatch.fencerA?.id === thirdPlaceMatch.winner.id
          ? thirdPlaceMatch.fencerB
          : thirdPlaceMatch.fencerA;
      if (fourthPlace) {
        const fourthPoolData = ranking.find(r => r.fencer.id === fourthPlace.id);
        results.push({
          rank: 4,
          fencer: fourthPlace,
          eliminatedAt: 'Petite Finale',
          poolTouches: fourthPoolData?.touchesScored,
          tableTouches: getTableTouches(fourthPlace.id, matchList),
          totalTouches:
            (fourthPoolData?.touchesScored ?? 0) + getTableTouches(fourthPlace.id, matchList),
        });
        processed.add(fourthPlace.id);
        // DEBUG: console.log('4ème place:', fourthPlace.lastName);
      }
    }

    // Parcourir les autres tours en ordre croissant (du plus proche de la finale au plus éloigné)
    // pour que les éliminés en demi-finale soient classés avant les quarts, etc.
    // Issue #61: Les éliminés en quarts se retrouvaient en bas du classement
    // Issue #60: Les tireurs éliminés à chaque tour ont des rangs distincts
    // Issue #59: Départage par somme des points Quest (poules + tableau)
    const effectiveSize = matchList.length > 0
      ? Math.max(...matchList.filter(m => m.round !== 3).map(m => m.round))
      : tableauSize;
    const rounds = [4, 8, 16, 32, 64, 128].filter(r => r <= effectiveSize);
    let currentRank = thirdPlaceMatch?.winner ? 5 : 3;

    // DEBUG: console.log('Rounds à traiter:', rounds, 'currentRank de départ:', currentRank);

    for (const round of rounds) {
      const roundMatches = matchList.filter(m => m.round === round && m.winner);
      const losersData: Array<{
        fencer: Fencer;
        poolRank: number;
        poolTouches: number;
        tableTouches: number;
        totalTouches: number;
      }> = [];

      for (const match of roundMatches) {
        const loser = match.fencerA?.id === match.winner?.id ? match.fencerB : match.fencerA;
        if (loser && !processed.has(loser.id)) {
          const poolRankEntry = ranking.find(r => r.fencer.id === loser.id);
          const poolTou = getPoolTouches(loser.id);
          const tableTou = getTableTouches(loser.id, matchList);

          losersData.push({
            fencer: loser,
            poolRank: poolRankEntry?.rank ?? 9999,
            poolTouches: poolTou,
            tableTouches: tableTou,
            totalTouches: poolTou + tableTou,
          });
          processed.add(loser.id);
        }
      }

      // Trier par classement de poules (croissant — meilleur classé en poules = meilleur rang final)
      losersData.sort((a, b) => a.poolRank - b.poolRank);

      // Issue #60: Assigner des rangs distincts (pas le même rang pour tous)
      for (const loserData of losersData) {
        results.push({
          rank: currentRank,
          fencer: loserData.fencer,
          eliminatedAt: getRoundName(round),
          poolTouches: loserData.poolTouches,
          tableTouches: loserData.tableTouches,
          totalTouches: loserData.totalTouches,
        });
        currentRank++;
      }
    }

    // DEBUG: console.log('Résultats finaux:', results.map(r => `${r.rank}. ${r.fencer.lastName}`).join(', '));

    return results.sort((a, b) => a.rank - b.rank);
  };

  // Construit les résultats combinés pour le mode playAllPositions
  const buildCombinedResults = (mainMatches: TableauMatch[], consolBrackets: ConsolationBracket[]): FinalResult[] => {
    const results: FinalResult[] = [];

    // Places 1-4 du tableau principal
    const finalM = mainMatches.find(m => m.round === 2);
    const thirdM = mainMatches.find(m => m.round === 3);
    if (finalM?.winner) {
      results.push({ rank: 1, fencer: finalM.winner, eliminatedAt: 'Vainqueur',
        poolTouches: getPoolTouches(finalM.winner.id), tableTouches: getTableTouches(finalM.winner.id, mainMatches), totalTouches: getPoolTouches(finalM.winner.id) + getTableTouches(finalM.winner.id, mainMatches) });
      const loser2 = finalM.fencerA?.id === finalM.winner.id ? finalM.fencerB : finalM.fencerA;
      if (loser2) results.push({ rank: 2, fencer: loser2, eliminatedAt: 'Finale',
        poolTouches: getPoolTouches(loser2.id), tableTouches: getTableTouches(loser2.id, mainMatches), totalTouches: getPoolTouches(loser2.id) + getTableTouches(loser2.id, mainMatches) });
    }
    if (thirdM?.winner) {
      results.push({ rank: 3, fencer: thirdM.winner, eliminatedAt: 'Petite Finale',
        poolTouches: getPoolTouches(thirdM.winner.id), tableTouches: getTableTouches(thirdM.winner.id, mainMatches), totalTouches: getPoolTouches(thirdM.winner.id) + getTableTouches(thirdM.winner.id, mainMatches) });
      const loser4 = thirdM.fencerA?.id === thirdM.winner.id ? thirdM.fencerB : thirdM.fencerA;
      if (loser4) results.push({ rank: 4, fencer: loser4, eliminatedAt: 'Petite Finale',
        poolTouches: getPoolTouches(loser4.id), tableTouches: getTableTouches(loser4.id, mainMatches), totalTouches: getPoolTouches(loser4.id) + getTableTouches(loser4.id, mainMatches) });
    }

    // Résultats de chaque bracket de consolation
    const sortedBrackets = [...consolBrackets].sort((a, b) => a.firstPlace - b.firstPlace);
    for (const bracket of sortedBrackets) {
      const bFinal = bracket.matches.find(m => m.round === 2);
      const bThird = bracket.matches.find(m => m.round === 3);
      const fp = bracket.firstPlace;
      if (bFinal?.winner) {
        results.push({ rank: fp, fencer: bFinal.winner, eliminatedAt: bracket.name,
          poolTouches: getPoolTouches(bFinal.winner.id), tableTouches: getTableTouches(bFinal.winner.id, bracket.matches), totalTouches: getPoolTouches(bFinal.winner.id) + getTableTouches(bFinal.winner.id, bracket.matches) });
        const l2 = bFinal.fencerA?.id === bFinal.winner.id ? bFinal.fencerB : bFinal.fencerA;
        if (l2) results.push({ rank: fp + 1, fencer: l2, eliminatedAt: bracket.name,
          poolTouches: getPoolTouches(l2.id), tableTouches: getTableTouches(l2.id, bracket.matches), totalTouches: getPoolTouches(l2.id) + getTableTouches(l2.id, bracket.matches) });
      }
      if (bThird?.winner) {
        results.push({ rank: fp + 2, fencer: bThird.winner, eliminatedAt: bracket.name,
          poolTouches: getPoolTouches(bThird.winner.id), tableTouches: getTableTouches(bThird.winner.id, bracket.matches), totalTouches: getPoolTouches(bThird.winner.id) + getTableTouches(bThird.winner.id, bracket.matches) });
        const l4 = bThird.fencerA?.id === bThird.winner.id ? bThird.fencerB : bThird.fencerA;
        if (l4) results.push({ rank: fp + 3, fencer: l4, eliminatedAt: bracket.name,
          poolTouches: getPoolTouches(l4.id), tableTouches: getTableTouches(l4.id, bracket.matches), totalTouches: getPoolTouches(l4.id) + getTableTouches(l4.id, bracket.matches) });
      }
    }

    return results.sort((a, b) => a.rank - b.rank);
  };

  const renderMatch = (match: TableauMatch, verticalPosition?: number) => (
    <MatchCard
      key={match.id}
      match={match}
      verticalPosition={verticalPosition}
      viewMode={viewMode}
      baseMatchHeight={BASE_MATCH_HEIGHT}
      onMatchClick={openScoreModal}
      onArenaClick={id => {
        setSelectedMatchForArena(id);
        setShowArenaModal(true);
      }}
    />
  );

  const calculateMatchVerticalPosition = (
    matchRound: number,
    matchPosition: number,
    baseRound: number
  ): number => {
    // k = nombre de créneaux de la première colonne couverts par ce match
    const k = baseRound / matchRound;
    // Centre ce match verticalement dans ses k créneaux
    return (matchPosition + 0.5) * k * SLOT_HEIGHT - BASE_MATCH_HEIGHT / 2;
  };

  const getMatchPosition = (match: TableauMatch): number => {
    if (viewMode === 'pending') return match.position;

    return calculateMatchVerticalPosition(match.round, match.position, tableauSize);
  };

  const renderRound = (round: number) => {
    const roundMatches =
      viewMode === 'pending'
        ? pendingMatches.filter(m => m.round === round)
        : matches.filter(m => m.round === round);
    const sortedMatches = [...roundMatches].sort((a, b) => a.position - b.position);

    const isExpanded = expandedRounds.size === 0 || expandedRounds.has(round);

    return (
      <div key={round} style={TV_STYLES.roundCol}>
        <div onClick={() => toggleRoundExpansion(round)} style={TV_STYLES.roundHeader}>
          <span style={TV_STYLES.roundHeaderChevron}>
            {isExpanded ? '▼' : '▶'}
          </span>
          {getRoundName(round)}
        </div>
        {isExpanded && (
          <div
            style={
              viewMode === 'full'
                ? { position: 'relative', height: `${(tableauSize / 2) * SLOT_HEIGHT}px` }
                : {}
            }
          >
            {sortedMatches.map(match => {
              const verticalPosition = viewMode === 'full' ? getMatchPosition(match) : undefined;
              return <div key={match.id}>{renderMatch(match, verticalPosition)}</div>;
            })}
          </div>
        )}
      </div>
    );
  };

  const convertToBracketMatches = (): BracketMatch[] => {
    return matches.map(match => ({
      id: match.id,
      round: Math.log2(tableauSize / match.round) + 1,
      position: match.position,
      fencerA: match.fencerA,
      fencerB: match.fencerB,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      winnerId: match.winner?.id,
      isBye: match.isBye,
    }));
  };

  if (ranking.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏆</div>
        <h2 className="empty-state-title">Tableau à élimination directe</h2>
        <p className="empty-state-description">
          Terminez d'abord les poules pour générer le tableau
        </p>
      </div>
    );
  }

  const finalMatch = matches.find(m => m.round === 2);
  const champion = finalMatch?.winner;

  const rounds: number[] = [];
  let r = tableauSize;
  while (r >= 2) {
    rounds.push(r);
    r = r / 2;
  }
  if ((thirdPlaceMatch || playAllPositions) && tableauSize >= 4) {
    const finalIndex = rounds.indexOf(2);
    if (finalIndex !== -1) {
      rounds.splice(finalIndex, 0, 3);
    } else {
      rounds.push(3);
    }
  }

  const pendingMatches = matches.filter(m => m.fencerA && m.fencerB && !m.isBye && !m.winner);
  const pendingViewRounds: number[] =
    viewMode === 'pending'
      ? [...new Set(matches.map(m => m.round))].sort((a, b) =>
          pendingOrder === 'asc' ? a - b : b - a
        )
      : [];

  const toggleRoundExpansion = (round: number) => {
    setExpandedRounds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(round)) {
        newSet.delete(round);
      } else {
        newSet.add(round);
      }
      return newSet;
    });
  };

  const renderPendingSection = (round: number) => {
    const roundMatches = matches
      .filter(m => m.round === round)
      .sort((a, b) => a.position - b.position);
    const isExpanded = expandedRounds.has(round);
    const roundName = round === 3 ? 'Petite Finale' : `Tableau de ${round}`;

    return (
      <div
        key={round}
        style={{
          background: 'white',
          borderRadius: '8px',
          marginBottom: '0.5rem',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
        }}
      >
        <div
          onClick={() => toggleRoundExpansion(round)}
          style={{
            padding: '0.75rem 1rem',
            background: '#f3f4f6',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>{isExpanded ? '▼' : '▶'}</span>
            <span style={{ fontWeight: '600', color: '#374151' }}>{roundName}</span>
          </div>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {roundMatches.length} match{roundMatches.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isExpanded && (
          <div style={{ padding: '0.5rem' }}>
            {roundMatches.map(match => (
              <div key={match.id} style={{ marginBottom: '0.5rem' }}>
                {renderMatch(match)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={TV_STYLES.root}>
      <TableauToolbar
        tableauSize={tableauSize}
        rankingCount={ranking.length}
        arenaCount={arenaCount}
        autoAssignArenas={autoAssignArenas}
        onAutoAssignToggle={handleAutoAssignToggle}
        onAutoFillScores={handleAutoFillScores}
        viewMode={viewMode}
        onViewModeToggle={() => setViewMode(viewMode === 'full' ? 'pending' : 'full')}
        pyramidViewMode={pyramidViewMode}
        onPyramidViewModeToggle={() => setPyramidViewMode(!pyramidViewMode)}
        onPrintClick={() => {
          setPdfMode('print');
          const rounds = [...new Set(matches.filter(m => m.fencerA && m.fencerB && !m.isBye).map(m => m.round))].sort((a, b) => b - a);
          setSelectedRounds(new Set(rounds));
          setShowPdfModal(true);
        }}
        onExportPdfClick={() => {
          setPdfMode('pdf');
          const rounds = [...new Set(matches.filter(m => m.fencerA && m.fencerB && !m.isBye).map(m => m.round))].sort((a, b) => b - a);
          setSelectedRounds(new Set(rounds));
          setShowPdfModal(true);
        }}
        onExportTreeClick={handleExportTree}
        champion={champion}
      />

      <div style={TV_STYLES.scrollArea}>
        {viewMode === 'pending' ? (
          pendingViewRounds.length > 0 ? (
            <>
              <div style={TV_STYLES.pendingOrderRow}>
                <button
                  onClick={() => setPendingOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  style={TV_STYLES.pendingOrderBtn}
                  title={pendingOrder === 'asc' ? 'Affichage croissant' : 'Affichage décroissant'}
                >
                  {pendingOrder === 'asc' ? '🔼 Croissant' : '🔽 Décroissant'}
                </button>
              </div>
              {pendingViewRounds.map(round => (
                <TableauPendingSection
                  key={round}
                  round={round}
                  matches={matches}
                  isExpanded={expandedRounds.has(round)}
                  onToggle={toggleRoundExpansion}
                  renderMatch={renderMatch}
                />
              ))}

              <div style={TV_STYLES.summaryBox}>
                <h4 style={TV_STYLES.summaryTitle}>Résumé des pistes</h4>
                <div style={TV_STYLES.summaryFlex}>
                  {Array.from({ length: arenaCount }, (_, i) => i + 1).map(arenaNum => {
                    const arenaMatches = pendingMatches.filter(m => m.arena === arenaNum);
                    return (
                      <div
                        key={arenaNum}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: arenaMatches.length > 0 ? '#d1fae5' : 'white',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <strong>Piste {arenaNum}</strong>: {arenaMatches.length} match
                        {arenaMatches.length !== 1 ? 's' : ''}
                      </div>
                    );
                  })}
                  <div
                    style={{
                      padding: '0.5rem 0.75rem',
                      background:
                        pendingMatches.filter(m => !m.arena).length > 0 ? '#fef3c7' : 'white',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <strong>Non assignés</strong>: {pendingMatches.filter(m => !m.arena).length}{' '}
                    match{pendingMatches.filter(m => !m.arena).length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={TV_STYLES.pendingEmpty}>✓ Tous les matches sont terminés</div>
          )
        ) : pyramidViewMode ? (
          <Bracket matches={convertToBracketMatches()} tableSize={tableauSize} />
        ) : (
          <>
            {playAllPositions && matches.some(m => m.round === tableauSize * 2) && (
              <div style={TV_STYLES.barragesBox}>
                <div style={TV_STYLES.barragesTitle}>Barrages</div>
                <div style={TV_STYLES.barragesFlex}>
                  {matches.filter(m => m.round === tableauSize * 2).sort((a, b) => a.position - b.position).map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      viewMode="full"
                      baseMatchHeight={BASE_MATCH_HEIGHT}
                      onMatchClick={openScoreModal}
                      onArenaClick={id => { setSelectedMatchForArena(id); setShowArenaModal(true); }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div style={TV_STYLES.fullRoundsRow}>
              {rounds.map(round => renderRound(round))}
            </div>
          </>
        )}
      </div>

      <SeedingTable ranking={ranking} tableauSize={tableauSize} />

      {/* Brackets de consolation (mode Jouer toutes les places) */}
      {playAllPositions && consolationBrackets.length > 0 && (
        <div style={TV_STYLES.consolationSection}>
          {consolationBrackets
            .sort((a, b) => a.firstPlace - b.firstPlace)
            .map(bracket => {
              const finalM = bracket.matches.find(m => m.round === 2);
              const bracketRounds: number[] = [];
              let r = bracket.size;
              while (r >= 2) { bracketRounds.push(r); r = r / 2; }
              if (bracket.matches.some(m => m.round === 3)) {
                const fi = bracketRounds.indexOf(2);
                if (fi !== -1) bracketRounds.splice(fi, 0, 3);
              }
              return (
                <div key={bracket.id} style={TV_STYLES.consolationCard}>
                  <div style={TV_STYLES.consolationHeader}>
                    <h3 style={TV_STYLES.consolationTitle}>🥋 {bracket.name}</h3>
                    {bracket.isComplete && (
                      <span style={TV_STYLES.consolationDoneBadge}>Terminé</span>
                    )}
                    {finalM?.winner && (
                      <span style={TV_STYLES.consolationWinnerBadge}>
                        🏆 {finalM.winner.lastName} {finalM.winner.firstName}
                      </span>
                    )}
                  </div>
                  <div style={TV_STYLES.consolationRoundsRow}>
                    {bracketRounds.map(round => {
                      const roundMatches = bracket.matches.filter(m => m.round === round).sort((a, b) => a.position - b.position);
                      const roundName = round === 3 ? 'Petite finale' : round === 2 ? 'Finale' : round === 4 ? 'Demi-finales' : round === 8 ? 'Quarts' : `Tableau de ${round}`;
                      return (
                        <div key={round} style={TV_STYLES.consolationRoundCol}>
                          <div style={TV_STYLES.consolationRoundTitle}>{roundName}</div>
                          <div style={TV_STYLES.consolationRoundMatches}>
                            {roundMatches.map(match => (
                              <MatchCard
                                key={match.id}
                                match={match}
                                viewMode="full"
                                baseMatchHeight={BASE_MATCH_HEIGHT}
                                onMatchClick={m => openScoreModal(m, bracket.id)}
                                onArenaClick={arenaCount > 0 && match.winner === null ? () => {
                                  setSelectedMatchForArena(match.id);
                                  setSelectedMatchConsolationBracketId(bracket.id);
                                  setShowArenaModal(true);
                                } : () => {}}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Score Modal */}
      {showScoreModal && editingMatch && (() => {
        const match = editingConsolationId
          ? consolationBrackets.find(b => b.id === editingConsolationId)?.matches.find(m => m.id === editingMatch)
          : matches.find(m => m.id === editingMatch);
        if (!match) return null;
        return (
          <TableauScoreModal
            match={match}
            editScoreA={editScoreA}
            setEditScoreA={setEditScoreA}
            editScoreB={editScoreB}
            setEditScoreB={setEditScoreB}
            maxScore={maxScore}
            isUnlimitedScore={isUnlimitedScore}
            modalRef={modalRef}
            onClose={() => setShowScoreModal(false)}
            onSubmit={handleScoreSubmit}
            onSpecialStatus={handleSpecialStatus}
            getRoundName={getRoundName}
          />
        );
      })()}

      {showPdfModal && (
        <div className="modal-overlay" onClick={() => setShowPdfModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{pdfMode === 'print' ? 'Imprimer' : 'Export PDF'} – Feuilles de match</h3>
              <button className="btn-close" onClick={() => setShowPdfModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={TV_STYLES.pdfModalBody}>
              <p style={TV_STYLES.pdfModalHint}>
                Chaque fiche contient le nom complet des combattants, une case score et une case
                signature.
              </p>
              <label style={TV_STYLES.pdfModalLabel}>
                Matchs par feuille A4{' '}
                <span style={TV_STYLES.pdfModalMaxHint}>(max {MAX_MATCHES_PER_PAGE_TABLEAU})</span>
              </label>
              <div style={TV_STYLES.pdfModalBtnRow}>
                {Array.from({ length: MAX_MATCHES_PER_PAGE_TABLEAU }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPdfMatchesPerPage(n)}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      background: pdfMatchesPerPage === n ? '#10b981' : '#e5e7eb',
                      color: pdfMatchesPerPage === n ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '1rem',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <label style={{ ...TV_STYLES.pdfModalLabel, marginTop: '1rem' }}>
                Phases à inclure
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {[...new Set(matches.filter(m => m.fencerA && m.fencerB && !m.isBye).map(m => m.round))]
                  .sort((a, b) => b - a)
                  .map(round => (
                    <label key={round} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedRounds.has(round)}
                        onChange={e => {
                          const next = new Set(selectedRounds);
                          if (e.target.checked) next.add(round); else next.delete(round);
                          setSelectedRounds(next);
                        }}
                      />
                      {getRoundName(round)}
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                        ({matches.filter(m => m.round === round && m.fencerA && m.fencerB && !m.isBye).length} match
                        {matches.filter(m => m.round === round && m.fencerA && m.fencerB && !m.isBye).length > 1 ? 's' : ''})
                      </span>
                    </label>
                  ))}
              </div>
              {(() => {
                const count = matches.filter(m => selectedRounds.has(m.round) && !m.isBye && m.fencerA && m.fencerB).length;
                return (
                  <p style={TV_STYLES.pdfModalCountHint}>
                    {count} match{count > 1 ? 's' : ''} →{' '}
                    {Math.ceil(count / pdfMatchesPerPage)} feuille
                    {Math.ceil(count / pdfMatchesPerPage) > 1 ? 's' : ''}
                  </p>
                );
              })()}
            </div>
            <div className="modal-footer" style={TV_STYLES.pdfModalFooter}>
              <button className="btn btn-secondary" onClick={() => setShowPdfModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleExportPDF} disabled={selectedRounds.size === 0}>
                {pdfMode === 'print' ? '🖨️ Imprimer' : '📄 Générer PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showArenaModal && selectedMatchForArena && (() => {
        const isConsolation = !!selectedMatchConsolationBracketId;
        const consolationBracket = isConsolation
          ? consolationBrackets.find(b => b.id === selectedMatchConsolationBracketId)
          : null;
        const currentArena = isConsolation
          ? (consolationBracket?.matches.find(m => m.id === selectedMatchForArena)?.arena ?? null)
          : (matches.find(m => m.id === selectedMatchForArena)?.arena ?? null);

        const closeModal = () => {
          setShowArenaModal(false);
          setSelectedMatchForArena(null);
          setSelectedMatchConsolationBracketId(null);
        };

        const assignArena = (arenaNum: number | null) => {
          const oldArena = currentArena;
          if (isConsolation && consolationBracket) {
            const updatedBracket = {
              ...consolationBracket,
              matches: consolationBracket.matches.map(m =>
                m.id === selectedMatchForArena ? { ...m, arena: arenaNum } : m
              ),
            };
            setConsolationBrackets(prev =>
              prev.map(b => b.id === consolationBracket.id ? updatedBracket : b)
            );
            const consolMatch = consolationBracket.matches.find(m => m.id === selectedMatchForArena);
            onMatchArenaChange?.(selectedMatchForArena!, oldArena, arenaNum, consolMatch?.fencerA ?? null, consolMatch?.fencerB ?? null);
          } else {
            const updatedMatches = matches.map(m =>
              m.id === selectedMatchForArena ? { ...m, arena: arenaNum } : m
            );
            onMatchesChange(updatedMatches);
            onMatchArenaChange?.(selectedMatchForArena!, oldArena, arenaNum);
          }
          closeModal();
        };

        return (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3 className="modal-title">Assigner à une piste</h3>
                <button className="btn-close" onClick={closeModal}>
                  &times;
                </button>
              </div>
              <div className="modal-body" style={TV_STYLES.arenaModalBody}>
                <p style={TV_STYLES.arenaModalHint}>Sélectionnez la piste pour ce match :</p>
                <div style={TV_STYLES.arenaModalGrid}>
                  <button
                    className={`btn ${!currentArena ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => assignArena(null)}
                    style={TV_STYLES.arenaModalNoArenaBtn}
                  >
                    -
                  </button>
                  {Array.from({ length: arenaCount }, (_, i) => i + 1).map(arenaNum => {
                    const queueCount = matches.filter(
                      m => m.arena === arenaNum && m.id !== selectedMatchForArena && m.winner === null
                    ).length;
                    return (
                      <button
                        key={arenaNum}
                        className={`btn ${currentArena === arenaNum ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => assignArena(arenaNum)}
                        style={{ padding: '0.75rem', position: 'relative' }}
                      >
                        Piste {arenaNum}
                        {queueCount > 0 && (
                          <span style={TV_STYLES.arenaQueueHint}>
                            (+{queueCount})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const TableauView = React.memo(TableauViewComponent);
export default TableauView;
