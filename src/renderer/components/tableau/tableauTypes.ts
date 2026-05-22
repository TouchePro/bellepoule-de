/**
 * BellePoule Modern - Types et utilitaires partagés du tableau d'élimination directe
 * Séparé de TableauView pour permettre le lazy-loading du composant.
 */

import { Fencer } from '../../../shared/types';

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
  poolTouches?: number;
  tableTouches?: number;
  totalTouches?: number;
}

export interface ConsolationBracket {
  id: string;
  name: string;
  firstPlace: number;
  matches: TableauMatch[];
  size: number;
  isComplete: boolean;
  sourceRound: number;
  parentBracketId: string;
}

export function propagateWinners(matchList: TableauMatch[], size: number): void {
  let currentRound = size;

  while (currentRound > 2) {
    const nextRound = currentRound / 2;
    const currentMatches = matchList.filter(m => m.round === currentRound);
    const nextMatches = matchList.filter(m => m.round === nextRound);

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

    nextMatches.forEach((nextMatch, nextIdx) => {
      if (nextMatch.scoreA !== null && nextMatch.scoreB !== null) return;

      const feederA = currentMatches[nextIdx * 2];
      const feederB = currentMatches[nextIdx * 2 + 1];

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

  const thirdPlaceMatchEntry = matchList.find(m => m.round === 3);
  if (thirdPlaceMatchEntry && size >= 4) {
    const semiFinalMatches = matchList.filter(m => m.round === 4);

    if (semiFinalMatches.length === 2) {
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
