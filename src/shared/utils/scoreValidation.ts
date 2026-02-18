/**
 * BellePoule Modern - Score Validation Utilities
 * Vérifications intelligentes des scores de match
 * Licensed under GPL-3.0
 */

import { Match, MatchStatus, Score } from '../types';

export interface ScoreValidationError {
  type: 'INVALID_SCORE' | 'MAX_SCORE_EXCEEDED' | 'INCONSISTENT_RESULT' | 'DUPLICATE_MATCH';
  message: string;
  severity: 'error' | 'warning';
  details?: string;
}

export interface ScoreValidationResult {
  isValid: boolean;
  errors: ScoreValidationError[];
  warnings: ScoreValidationError[];
}

/**
 * Valide un score de match
 */
export function validateMatchScore(
  scoreA: number | null,
  scoreB: number | null,
  maxScore: number,
  options: {
    allowTie?: boolean;
    checkWinnerHasMax?: boolean;
  } = {}
): ScoreValidationResult {
  const result: ScoreValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const { allowTie = false, checkWinnerHasMax = true } = options;

  // Vérifie que les scores sont des nombres valides
  if (scoreA === null || scoreB === null) {
    return result; // Scores non renseignés = OK
  }

  if (isNaN(scoreA) || isNaN(scoreB)) {
    result.isValid = false;
    result.errors.push({
      type: 'INVALID_SCORE',
      message: 'Scores invalides',
      severity: 'error',
      details: 'Les scores doivent être des nombres',
    });
    return result;
  }

  if (scoreA < 0 || scoreB < 0) {
    result.isValid = false;
    result.errors.push({
      type: 'INVALID_SCORE',
      message: 'Scores négatifs',
      severity: 'error',
      details: 'Les scores ne peuvent pas être négatifs',
    });
  }

  // Vérifie que le score max n'est pas dépassé
  if (scoreA > maxScore || scoreB > maxScore) {
    result.isValid = false;
    result.errors.push({
      type: 'MAX_SCORE_EXCEEDED',
      message: `Score maximum dépassé (${maxScore})`,
      severity: 'error',
      details: `Le score maximum pour ce match est de ${maxScore}`,
    });
  }

  // Vérifie qu'il y a un vainqueur (sauf si match nul autorisé)
  if (scoreA === scoreB && !allowTie) {
    result.isValid = false;
    result.errors.push({
      type: 'INCONSISTENT_RESULT',
      message: 'Match nul non autorisé',
      severity: 'error',
      details: 'Il doit y avoir un vainqueur dans ce match',
    });
  }

  // Vérifie que le vainqueur a bien le score max (si activé)
  if (checkWinnerHasMax && scoreA !== scoreB) {
    const winnerScore = Math.max(scoreA, scoreB);
    if (winnerScore !== maxScore) {
      result.warnings.push({
        type: 'INCONSISTENT_RESULT',
        message: "Le vainqueur n'a pas le score maximum",
        severity: 'warning',
        details: `Le vainqueur devrait avoir ${maxScore} touches`,
      });
    }
  }

  // Alerte si scores inhabituels (ex: 0-5, 1-5)
  const loserScore = Math.min(scoreA, scoreB);
  if (loserScore === 0) {
    result.warnings.push({
      type: 'INCONSISTENT_RESULT',
      message: 'Score unilatéral détecté',
      severity: 'warning',
      details: 'Vérifiez que le score est correct (5-0)',
    });
  }

  return result;
}

/**
 * Vérifie s'il y a des matchs en double
 */
export function checkDuplicateMatches(
  matches: Match[],
  currentMatchId: string,
  fencerAId: string,
  fencerBId: string
): ScoreValidationError | null {
  const duplicate = matches.find(
    m =>
      m.id !== currentMatchId &&
      m.status !== MatchStatus.CANCELLED &&
      ((m.fencerA?.id === fencerAId && m.fencerB?.id === fencerBId) ||
        (m.fencerA?.id === fencerBId && m.fencerB?.id === fencerAId))
  );

  if (duplicate) {
    return {
      type: 'DUPLICATE_MATCH',
      message: 'Match en double détecté',
      severity: 'error',
      details: `Ce match existe déjà (ID: ${duplicate.id})`,
    };
  }

  return null;
}

/**
 * Valide tous les matchs d'une poule
 */
export function validatePoolMatches(
  matches: Match[],
  maxScore: number
): Map<string, ScoreValidationResult> {
  const results = new Map<string, ScoreValidationResult>();

  for (const match of matches) {
    const scoreA = match.scoreA?.value ?? null;
    const scoreB = match.scoreB?.value ?? null;

    const validation = validateMatchScore(scoreA, scoreB, maxScore);

    // Vérifie les doublons
    if (match.fencerA && match.fencerB) {
      const duplicateError = checkDuplicateMatches(
        matches,
        match.id,
        match.fencerA.id,
        match.fencerB.id
      );
      if (duplicateError) {
        validation.isValid = false;
        validation.errors.push(duplicateError);
      }
    }

    results.set(match.id, validation);
  }

  return results;
}

/**
 * Formate un message de validation pour affichage
 */
export function formatValidationMessage(result: ScoreValidationResult): string {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push(...result.errors.map(e => `❌ ${e.message}`));
  }

  if (result.warnings.length > 0) {
    messages.push(...result.warnings.map(w => `⚠️ ${w.message}`));
  }

  return messages.join('\n');
}

/**
 * Vérifie si un score est complet et valide
 */
export function isValidCompleteScore(
  scoreA: Score | null,
  scoreB: Score | null,
  maxScore: number
): boolean {
  if (!scoreA?.value || !scoreB?.value) return false;

  const validation = validateMatchScore(scoreA.value, scoreB.value, maxScore);
  return validation.isValid && validation.errors.length === 0;
}
