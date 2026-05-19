/**
 * BellePoule Modern - Tableau View Component
 * Direct Elimination Table
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Fencer, FencerStatus, PoolRanking } from '../../shared/types';
import { useToast } from './Toast';
import { useModalResize } from '../hooks/useModalResize';
import Bracket from './Bracket';
import { exportTableauToPDF, printTableauHTML, MAX_MATCHES_PER_PAGE_TABLEAU } from '../../shared/utils/pdfExport';
import { usePdfTemplateStore } from '../../features/pdfTemplates/hooks/usePdfTemplateStore';
import MatchCard from './tableau/MatchCard';
import SeedingTable from './tableau/SeedingTable';

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

export interface TableauMatch {
  id: string;
  round: number;
  position: number;
  fencerA: Fencer | null;
  fencerB: Fencer | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: Fencer | null;
  isBye: boolean;
  arena?: number | null;
}

export interface FinalResult {
  rank: number;
  fencer: Fencer;
  eliminatedAt: string;
  poolTouches?: number; // Touches marquées en poules
  tableTouches?: number; // Touches marquées en tableau
  totalTouches?: number; // Total pour départage (poules + tableau)
}

interface ConsolationBracket {
  id: string;
  name: string;
  firstPlace: number;
  matches: TableauMatch[];
  size: number;
  isComplete: boolean;
  sourceRound: number; // round du bracket parent qui a généré ce bracket
  parentBracketId: string; // 'main' ou id d'un bracket de consolation
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
  onMatchArenaChange?: (matchId: string, oldArena: number | null, newArena: number | null) => void;
}

const BASE_MATCH_HEIGHT = 100;
const SLOT_HEIGHT = BASE_MATCH_HEIGHT + 50; // hauteur d'un créneau dans la première colonne

export function propagateWinners(matchList: TableauMatch[], size: number): void {
  let currentRound = size;

  while (currentRound > 2) {
    const nextRound = currentRound / 2;
    const currentMatches = matchList.filter(m => m.round === currentRound);
    const nextMatches = matchList.filter(m => m.round === nextRound);

    // Première passe : propager tous les gagnants (y compris les exempts)
    currentMatches.forEach((match, idx) => {
      if (match.winner) {
        const nextMatchIdx = Math.floor(idx / 2);
        const nextMatch = nextMatches[nextMatchIdx];
        if (nextMatch) {
          if (idx % 2 === 0) {
            nextMatch.fencerA = match.winner;
          } else {
            nextMatch.fencerB = match.winner;
          }
        }
      }
    });

    // Deuxième passe : vérifier les exempts au tour suivant
    nextMatches.forEach((nextMatch, nextIdx) => {
      // Ne pas modifier les matchs déjà joués
      if (nextMatch.scoreA !== null && nextMatch.scoreB !== null) return;

      const feederA = currentMatches[nextIdx * 2];
      const feederB = currentMatches[nextIdx * 2 + 1];

      // Vérifier si les deux matchs sources sont résolus
      const feederAResolved =
        !feederA ||
        feederA.winner !== null ||
        (feederA.isBye && !feederA.fencerA && !feederA.fencerB);
      const feederBResolved =
        !feederB ||
        feederB.winner !== null ||
        (feederB.isBye && !feederB.fencerA && !feederB.fencerB);

      if (feederAResolved && feederBResolved) {
        if (nextMatch.fencerA && !nextMatch.fencerB) {
          nextMatch.winner = nextMatch.fencerA;
          nextMatch.isBye = true;
        } else if (!nextMatch.fencerA && nextMatch.fencerB) {
          nextMatch.winner = nextMatch.fencerB;
          nextMatch.isBye = true;
        } else if (nextMatch.fencerA && nextMatch.fencerB) {
          nextMatch.isBye = false;
          nextMatch.winner = null;
        }
      }
    });

    currentRound = nextRound;
  }

  // Gérer le match de 3ème place si présent dans matchList
  const thirdPlaceMatchEntry = matchList.find(m => m.round === 3);
  if (thirdPlaceMatchEntry && size >= 4) {
    const semiFinalMatches = matchList.filter(m => m.round === 4);

    if (semiFinalMatches.length === 2) {
      // Assigner les perdants des demi-finales au match de 3ème place
      const losers: Fencer[] = [];

      semiFinalMatches.forEach(semiFinal => {
        if (semiFinal.winner) {
          const loser =
            semiFinal.fencerA?.id === semiFinal.winner.id ? semiFinal.fencerB : semiFinal.fencerA;
          if (loser) losers.push(loser);
        }
      });

      if (losers.length === 2) {
        thirdPlaceMatchEntry.fencerA = losers[0];
        thirdPlaceMatchEntry.fencerB = losers[1];
      }
    }
  }
}

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
  const [pyramidViewMode, setPyramidViewMode] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfMode, setPdfMode] = useState<'print' | 'pdf'>('pdf');
  const [pdfMatchesPerPage, setPdfMatchesPerPage] = useState<number>(MAX_MATCHES_PER_PAGE_TABLEAU);
  const [autoAssignArenas, setAutoAssignArenas] = useState(true);
  const isUnlimitedScore = maxScore === 999;
  const prevMatchesLengthRef = useRef(0);
  const mountMatchesRef = useRef(matches);
  const [consolationBrackets, setConsolationBrackets] = useState<ConsolationBracket[]>([]);

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
      const mainRounds = [tableauSize, ...Array.from({ length: Math.log2(tableauSize) - 2 }, (_, i) => tableauSize / Math.pow(2, i + 1))].filter(r => r >= 4);
      for (const round of mainRounds) {
        if (!isRoundComplete(matches, round)) continue;
        const alreadyExists = updated.some(b => b.sourceRound === round && b.parentBracketId === 'main');
        if (alreadyExists) continue;
        const losers = getRoundLosers(matches, round, ranking);
        if (losers.length === 0) continue;
        const fp = consolationFirstPlace(tableauSize, 1, round);
        updated.push(buildConsolationBracket(losers, fp, round, 'main'));
        changed = true;
      }

      // Vérifier les brackets de consolation existants pour créer des sous-brackets
      for (const bracket of updated) {
        if (bracket.isComplete) continue;
        const bracketRounds = Array.from(
          { length: Math.log2(bracket.size) - 1 },
          (_, i) => bracket.size / Math.pow(2, i)
        ).filter(r => r >= 4);

        for (const round of bracketRounds) {
          if (!isRoundComplete(bracket.matches, round)) continue;
          const alreadyExists = updated.some(b => b.sourceRound === round && b.parentBracketId === bracket.id);
          if (alreadyExists) continue;
          const losers = getRoundLosers(bracket.matches, round, ranking);
          if (losers.length === 0) continue;
          const fp = consolationFirstPlace(bracket.size, bracket.firstPlace, round);
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

    // Pour chaque barrage terminé, placer le gagnant dans le premier tour du tableau
    let needsUpdate = false;
    const updatedMatches = matches.map(m => ({ ...m }));
    const firstRoundMatches = updatedMatches.filter(m => m.round === tableauSize);
    const seeding = generateFIESeeding(tableauSize);
    const directCount = firstRoundMatches.reduce((count, m) => {
      return count + (m.fencerA ? 1 : 0) + (m.fencerB ? 1 : 0);
    }, 0);

    // Les derniers slots du seeding correspondent aux gagnants des barrages
    // Nombre de barrages = barrageMatches.length
    const barrageWinnerSlots: number[] = [];
    // Les seeds au-delà de directCount (dans le seeding) sont les slots pour les gagnants de barrages
    const allDirectSeeds = seeding.filter(s => s <= directCount);
    const barrageSeeds = seeding.filter(s => s > directCount && s <= directCount + barrageMatches.length);
    barrageSeeds.forEach((seed, idx) => {
      barrageWinnerSlots.push(seed - 1); // 0-indexed rank → index dans le seeding
    });

    for (let i = 0; i < barrageMatches.length; i++) {
      const barrage = barrageMatches[i];
      if (!barrage.winner) continue;
      // Le gagnant du barrage i va dans la position du barrage dans le seeding
      // seed = directCount + i + 1, position dans le seeding
      const targetSeed = directCount + i + 1;
      const targetPos = seeding.indexOf(targetSeed);
      if (targetPos < 0) continue;
      // targetPos est un index dans les tireurs du premier tour (0..size-1)
      // Le match dans le premier tour: match i = position [i/2], fencerA si i est pair, fencerB si impair
      const matchIdx = Math.floor(targetPos / 2);
      const isA = targetPos % 2 === 0;
      const match = firstRoundMatches[matchIdx];
      if (!match) continue;
      const matchInUpdated = updatedMatches.find(m => m.id === match.id);
      if (!matchInUpdated) continue;
      if (isA && !matchInUpdated.fencerA) {
        matchInUpdated.fencerA = barrage.winner;
        needsUpdate = true;
      } else if (!isA && !matchInUpdated.fencerB) {
        matchInUpdated.fencerB = barrage.winner;
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
  // size = taille du bracket parent, parentFirstPlace = sa première place couverte
  const consolationFirstPlace = (parentSize: number, parentFirstPlace: number, round: number): number => {
    // Nombre de perdants dans ce round = parentSize / round
    const losersCount = parentSize / round;
    // Le bracket parent couvre les places parentFirstPlace à parentFirstPlace + parentSize - 1.
    // Les rounds > ce round (plus profonds dans le bracket) vont vers d'autres consolations.
    // Ce round-ci cover les dernières `losersCount` places du bracket parent.
    return parentFirstPlace + parentSize - losersCount;
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
        let scoreA = Math.floor(Math.random() * (maxScore + 1));
        let scoreB = Math.floor(Math.random() * (maxScore + 1));

        // Éviter les égalités en élimination directe sans dépasser maxScore
        if (scoreA === scoreB) {
          if (Math.random() > 0.5) {
            if (scoreA < maxScore) scoreA += 1;
            else scoreB -= 1;
          } else {
            if (scoreB < maxScore) scoreB += 1;
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
      let scoreA = Math.floor(Math.random() * (maxScore + 1));
      let scoreB = Math.floor(Math.random() * (maxScore + 1));

      if (scoreA === scoreB) {
        if (Math.random() > 0.5) {
          if (scoreA < maxScore) scoreA += 1;
          else scoreB -= 1;
        } else {
          if (scoreB < maxScore) scoreB += 1;
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
    const title = `Tableau de ${tableauSize}`;
    const logo = localStorage.getItem('bellepoule-logo') ?? undefined;
    try {
      if (pdfMode === 'print') {
        await printTableauHTML(matches, perPage, title, logo, tableauTemplate);
      } else {
        await exportTableauToPDF(matches, perPage, title, logo, tableauTemplate);
      }
      setShowPdfModal(false);
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
      <div
        key={round}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          minWidth: '200px',
        }}
      >
        <div
          onClick={() => toggleRoundExpansion(round)}
          style={{
            textAlign: 'center',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#374151',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 'bold', marginRight: '0.25rem' }}>
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
    <div style={{ padding: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
          Tableau de {tableauSize} - {ranking.length} qualifiés
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {arenaCount > 0 && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.875rem',
                color: '#374151',
                cursor: 'pointer',
                padding: '0.5rem 0.75rem',
                background: autoAssignArenas ? '#eff6ff' : '#f3f4f6',
                border: `1px solid ${autoAssignArenas ? '#3b82f6' : '#d1d5db'}`,
                borderRadius: '6px',
                userSelect: 'none',
              }}
              title="Assigne automatiquement les matchs aux arènes disponibles en round-robin"
            >
              <input
                type="checkbox"
                checked={autoAssignArenas}
                onChange={e => handleAutoAssignToggle(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>🏟️ Assignation auto</span>
            </label>
          )}
          <button
            onClick={handleAutoFillScores}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            🎲 Remplir auto
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'full' ? 'pending' : 'full')}
            style={{
              background: viewMode === 'pending' ? '#3b82f6' : '#e5e7eb',
              color: viewMode === 'pending' ? 'white' : '#374151',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title={
              viewMode === 'full'
                ? 'Afficher les matches en attente'
                : 'Afficher le tableau complet'
            }
          >
            {viewMode === 'full' ? '📋 Matchs en attente' : '📊 Tableau complet'}
          </button>
          <button
            onClick={() => setPyramidViewMode(!pyramidViewMode)}
            style={{
              background: pyramidViewMode ? '#8b5cf6' : '#e5e7eb',
              color: pyramidViewMode ? 'white' : '#374151',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title={pyramidViewMode ? 'Vue tableau' : 'Vue pyramidale'}
          >
            {pyramidViewMode ? '🔲 Tableau' : '🔺 Pyramide'}
          </button>
          <button
            onClick={() => { setPdfMode('print'); setShowPdfModal(true); }}
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Imprimer les feuilles de match"
          >
            🖨️ Imprimer
          </button>
          <button
            onClick={() => { setPdfMode('pdf'); setShowPdfModal(true); }}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Exporter les feuilles de match en PDF"
          >
            📄 Export PDF
          </button>
          {champion && (
            <div
              style={{
                background: '#fef3c7',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🏆</span>
              <span style={{ fontWeight: '600' }}>
                {champion.lastName} {champion.firstName}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '8px',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {viewMode === 'pending' ? (
          pendingViewRounds.length > 0 ? (
            <>
              <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setPendingOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  style={{
                    background: '#e5e7eb',
                    border: 'none',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  title={pendingOrder === 'asc' ? 'Affichage croissant' : 'Affichage décroissant'}
                >
                  {pendingOrder === 'asc' ? '🔼 Croissant' : '🔽 Décroissant'}
                </button>
              </div>
              {pendingViewRounds.map(round => renderPendingSection(round))}

              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                }}
              >
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Résumé des pistes
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
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
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              ✓ Tous les matches sont terminés
            </div>
          )
        ) : pyramidViewMode ? (
          <Bracket matches={convertToBracketMatches()} tableSize={tableauSize} />
        ) : (
          <>
            {playAllPositions && matches.some(m => m.round === tableauSize * 2) && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1e40af' }}>Barrages</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
              {rounds.map(round => renderRound(round))}
            </div>
          </>
        )}
      </div>

      <SeedingTable ranking={ranking} tableauSize={tableauSize} />

      {/* Brackets de consolation (mode Jouer toutes les places) */}
      {playAllPositions && consolationBrackets.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
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
                <div
                  key={bracket.id}
                  style={{
                    background: '#f9fafb',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
                      🥋 {bracket.name}
                    </h3>
                    {bracket.isComplete && (
                      <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>
                        Terminé
                      </span>
                    )}
                    {finalM?.winner && (
                      <span style={{ background: '#fef3c7', padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600 }}>
                        🏆 {finalM.winner.lastName} {finalM.winner.firstName}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
                    {bracketRounds.map(round => {
                      const roundMatches = bracket.matches.filter(m => m.round === round).sort((a, b) => a.position - b.position);
                      const roundName = round === 3 ? 'Petite finale' : round === 2 ? 'Finale' : round === 4 ? 'Demi-finales' : round === 8 ? 'Quarts' : `Tableau de ${round}`;
                      return (
                        <div key={round} style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
                          <div style={{ textAlign: 'center', fontWeight: 600, marginBottom: '0.5rem', color: '#374151', fontSize: '0.875rem' }}>
                            {roundName}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {roundMatches.map(match => (
                              <MatchCard
                                key={match.id}
                                match={match}
                                viewMode="full"
                                baseMatchHeight={BASE_MATCH_HEIGHT}
                                onMatchClick={m => openScoreModal(m, bracket.id)}
                                onArenaClick={() => {}}
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
      {(() => {
        if (!showScoreModal || !editingMatch) return null;

        const match = editingConsolationId
          ? consolationBrackets.find(b => b.id === editingConsolationId)?.matches.find(m => m.id === editingMatch)
          : matches.find(m => m.id === editingMatch);
        if (!match) return null;

        const scoreModal = (
          <div className="modal-overlay" onClick={() => setShowScoreModal(false)}>
            <div
              ref={modalRef}
              className="modal resizable"
              style={{
                maxWidth: '900px',
                width: '95%',
                minHeight: '400px',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header" style={{ cursor: 'move' }}>
                <h3 className="modal-title">{getRoundName(match.round)} - Saisie rapide</h3>
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
                  {/* Tireur A */}
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
                      {match.fencerA?.lastName}
                    </div>
                    <div style={{ fontSize: '1rem', color: '#6b7280', textAlign: 'right' }}>
                      {match.fencerA?.firstName} {match.fencerA?.club && `(${match.fencerA.club})`}
                    </div>
                  </div>

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
                        (parseInt(editScoreA, 10) || 0) > (isUnlimitedScore ? 999 : maxScore)
                          ? '#ef4444'
                          : undefined,
                      borderWidth:
                        (parseInt(editScoreA, 10) || 0) > (isUnlimitedScore ? 999 : maxScore)
                          ? '2px'
                          : undefined,
                    }}
                    value={editScoreA}
                    onChange={e => setEditScoreA(e.target.value)}
                    min="0"
                    max={isUnlimitedScore ? undefined : maxScore}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScoreSubmit();
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
                        (parseInt(editScoreB, 10) || 0) > (isUnlimitedScore ? 999 : maxScore)
                          ? '#ef4444'
                          : undefined,
                      borderWidth:
                        (parseInt(editScoreB, 10) || 0) > (isUnlimitedScore ? 999 : maxScore)
                          ? '2px'
                          : undefined,
                    }}
                    value={editScoreB}
                    onChange={e => setEditScoreB(e.target.value)}
                    min="0"
                    max={isUnlimitedScore ? undefined : maxScore}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScoreSubmit();
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

                  {/* Tireur B */}
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
                      {match.fencerB?.lastName}
                    </div>
                    <div style={{ fontSize: '1rem', color: '#6b7280', textAlign: 'left' }}>
                      {match.fencerB?.firstName} {match.fencerB?.club && `(${match.fencerB.club})`}
                    </div>
                  </div>
                </div>

                {/* Info score max */}
                {!isUnlimitedScore && maxScore > 0 && (
                  <p
                    className="text-sm text-muted"
                    style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1rem' }}
                  >
                    💡 Score maximum : {maxScore} touches
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
                    marginTop: '1rem',
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
                </div>
              </div>
              <div
                className="modal-footer"
                style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}
              >
                <button className="btn btn-secondary" onClick={() => setShowScoreModal(false)}>
                  Annuler
                </button>
                <button className="btn btn-primary" onClick={handleScoreSubmit}>
                  Valider
                </button>
              </div>
            </div>
          </div>
        );

        return scoreModal;
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
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                Chaque fiche contient le nom complet des combattants, une case score et une case
                signature.
              </p>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                Matchs par feuille A4{' '}
                <span style={{ fontWeight: '400', color: '#6b7280' }}>
                  (max {MAX_MATCHES_PER_PAGE_TABLEAU})
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
              <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                {matches.filter(m => !m.isBye && m.fencerA && m.fencerB).length} matchs →{' '}
                {Math.ceil(
                  matches.filter(m => !m.isBye && m.fencerA && m.fencerB).length / pdfMatchesPerPage
                )}{' '}
                feuille
                {Math.ceil(
                  matches.filter(m => !m.isBye && m.fencerA && m.fencerB).length / pdfMatchesPerPage
                ) > 1
                  ? 's'
                  : ''}
              </p>
            </div>
            <div
              className="modal-footer"
              style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}
            >
              <button className="btn btn-secondary" onClick={() => setShowPdfModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleExportPDF}>
                {pdfMode === 'print' ? '🖨️ Imprimer' : '📄 Générer PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showArenaModal && selectedMatchForArena && (
        <div className="modal-overlay" onClick={() => setShowArenaModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Assigner à une piste</h3>
              <button className="btn-close" onClick={() => setShowArenaModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                Sélectionnez la piste pour ce match :
              </p>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}
              >
                <button
                  className={`btn ${!matches.find(m => m.id === selectedMatchForArena)?.arena ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    const oldArena =
                      matches.find(m => m.id === selectedMatchForArena)?.arena ?? null;
                    const updatedMatches = matches.map(m =>
                      m.id === selectedMatchForArena ? { ...m, arena: null } : m
                    );
                    onMatchesChange(updatedMatches);
                    onMatchArenaChange?.(selectedMatchForArena!, oldArena, null);
                    setShowArenaModal(false);
                    setSelectedMatchForArena(null);
                  }}
                  style={{ padding: '0.75rem' }}
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
                      className={`btn ${matches.find(m => m.id === selectedMatchForArena)?.arena === arenaNum ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        const oldArena =
                          matches.find(m => m.id === selectedMatchForArena)?.arena ?? null;
                        const updatedMatches = matches.map(m =>
                          m.id === selectedMatchForArena ? { ...m, arena: arenaNum } : m
                        );
                        onMatchesChange(updatedMatches);
                        onMatchArenaChange?.(selectedMatchForArena!, oldArena, arenaNum);
                        setShowArenaModal(false);
                        setSelectedMatchForArena(null);
                      }}
                      style={{ padding: '0.75rem', position: 'relative' }}
                    >
                      Piste {arenaNum}
                      {queueCount > 0 && (
                        <span
                          style={{ fontSize: '0.7rem', marginLeft: '0.3rem', color: '#6b7280' }}
                        >
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
      )}
    </div>
  );
};

const TableauView = React.memo(TableauViewComponent);
export default TableauView;
